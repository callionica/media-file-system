"use strict";

let evid;

function ready(callback) {
	// in case the document is already rendered
	if (document.readyState != 'loading') {
		callback();
	}
	// modern browsers
	else if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', callback);
	}
	// IE <= 8
	else {
		document.attachEvent('onreadystatechange', function(){
			if (document.readyState == 'complete') {
				callback();
			}
		});
	}
}

// TODO - clean this up
function togglePlay() {
	evid.togglePlay();
}

class EnhancedVideo {
	constructor(video) {
		this.video = video;

		// The index of the currently active subtitle track
		this.subtitleIndex_ = 0;

		// Whether the user wants subtitles to be displayed or not
		this.subtitleUserVisible_ = true;

		// The current subtitle visibility according to rules like don't show subtitles if paused
		this.subtitleRuleVisible_ = true;
	}

	get subtitles() {
		return [...this.video.textTracks].filter(track => track.kind === "subtitles");;
	}

	get subtitleIndex() {
		return this.subtitleIndex_;
	}

	set subtitleIndex(value) {
		if (value > this.subtitles.length - 1) {
			value = 0;
		}
		if (value < 0) {
			value = this.subtitles.length - 1;
		}

		this.subtitleIndex_ = value;
		this.updateSubtitle();
	}

	get currentSubtitle() {
		return this.subtitles[this.subtitleIndex];
	}

	get currentTime() {
		return this.video.currentTime;
	}

	set currentTime(value) {
		this.video.currentTime = value;
	}

	/*
	Takes the current time and adjusts it backwards slightly so that it can be used
	as the start time when playing the video. Currently we use the subtitle cues to
	decide where to move the playhead: we position the playhead just prior to the start 
	of the current sentence-starting cue. This means that we don't have big gaps without subtitles when
	we first start a video. It also means we often end up positioning the playhead between
	phrases so we reduce the number of cut off words.
	(Audio analysis to position the playhead between phrases would be better, but this is easier).
	*/
	get currentTimeQuantized() {

		function getCueForTime(cues, time) {
			return cues.find(cue => (cue.startTime <= time) && (time <= cue.endTime));
		}

		let re = /^\p{Uppercase_Letter}$/u;

		function isUpperCaseLetter(ch) {
			return !!ch.match(re);
		}

		function startOfSentence(cues, index, time, limit) {
			// Work our way backwards through the cues until we find one
			// that starts with an uppercase letter or until we exceed our time limit
			const e = document.createElement("div");
			for (; index >= 0; --index) {
				const cue = cues[index];
				if ((time - cue.startTime) > limit) {
					return undefined;
				}
				// We do this to strip markup from the cue's text
				e.innerHTML = cue.text;
				const cueText = e.textContent;
				const first = cueText[0];
				const isStart = first && isUpperCaseLetter(first);
				if (isStart) {
					return cue;
				}
			}
			return undefined;
		}

		/*
		getCueForTimeAndSentence - Given a set of cues (subtitles) and a time, find the cue that overlaps the specified time then, starting with that time-overlapping cue, find the sentence-starting cue that is up to 15s prior to the specified time. If a sentence-starting cue cannot be found, return the time-overlapping cue. If no time-overlapping cue can be found, return undefined. A sentence-starting cue is recognized by the first character being a Unicode-defined Uppercase_Letter. This definition of "sentence" can fail in various ways (notably: when cues are provided IN ALL UPPERCASE, we will return mid-sentence cues; when music/lyrics start with # or ♫, we may return an earlier cue than necessary), but failure is not catastrophic for our use cases.
		*/
		function getCueForTimeAndSentence(cues, time) {
			// Allow us to go back to a previous cue some number of seconds in the past
			const limit = 15.0;
			const index = cues.findIndex(cue => (cue.startTime <= time) && (time <= cue.endTime));
			if (index >= 0) {
				const start = startOfSentence(cues, index, time, limit);
				if (start) {
					return start;
				}
				return cues[index];
			}
		}

		let referenceTime = this.video.currentTime;
		let track = this.currentSubtitle;
		if (track && track.cues) {
			let cues = [...track.cues];
			let cue = getCueForTimeAndSentence(cues, referenceTime);
			if (cue) {
				/*
				We return a time just prior to the cue start time to provide a better user experience
				*/
				const fudge = 0.001;
				return cue.startTime - fudge;
			}
		}
		return referenceTime;
	}

	updateSubtitle() {
		// Disable all subtitles except the current track
		let s = this.currentSubtitle;
		this.subtitles.forEach(track => {
			if (track !== s) {
				if (track.mode !== "disabled") {
					track.mode = "disabled";
				}
			} else {
				track.mode = this.subtitleVisible ? "showing" : "hidden";	
			}
		});
	}

	get subtitleRuleVisible() {
		return this.subtitleRuleVisible_;
	}

	set subtitleRuleVisible(value) {
		this.subtitleRuleVisible_ = value;
		this.updateSubtitle();
	}

	get subtitleUserVisible() {
		return this.subtitleUserVisible_;
	}

	set subtitleUserVisible(value) {
		this.subtitleUserVisible_ = value;
		this.updateSubtitle();
	}

	// The effective visibility of the subtitles given user preference and rules
	get subtitleVisible() {
		return this.subtitleUserVisible_ && this.subtitleRuleVisible_;
	}

	togglePlay() {
		if (this.video.paused) {
			// Move the playhead back to the start of the current subtitle cue
			if (evid.currentTime !== evid.currentTimeQuantized) {
				evid.currentTime = evid.currentTimeQuantized;
			}

			// Show subtitles if hidden
			evid.subtitleRuleVisible = true;

			// Give video player a chance to catch up with our requests
			const delay = 0.3;
			window.setTimeout(() => {

				// Start video playing
				this.video.play();

			}, delay * 1000);
			
		} else {
			this.video.pause();
		}
	}

	cycleSubtitle() {
		this.subtitleIndex += 1;
	}
}

function exitFullscreen() {
	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	}
}

function requestFullscreen(video) {
	if (video.requestFullscreen) {
		video.requestFullscreen();
	} else if (video.webkitRequestFullscreen) {
		video.webkitRequestFullscreen();
	}
}

function fullscreenElement() {
	return document.fullscreenElement || document.webkitFullscreenElement;
}

function exitPictureInPicture(video) {
	if (document.exitPictureInPicture) {
		document.exitPictureInPicture();
	} else if (document.webkitExitPictureInPicture) {
		document.webkitExitPictureInPicture();
	} else if (video.webkitSetPresentationMode) {
		video.webkitSetPresentationMode("inline");
	}
}

function requestPictureInPicture(video) {
	if (video.requestPictureInPicture) {
		video.requestPictureInPicture();
	} else if (video.webkitRequestPictureInPicture) {
		video.webkitRequestPictureInPicture();
	} else if (video.webkitSetPresentationMode) {
		video.webkitSetPresentationMode("picture-in-picture");
	}
}

function isPictureInPicture(video) {
	var element = document.pictureInPictureElement;
	if (element === video) {
		return true;
	}
	return (video.webkitPresentationMode === "picture-in-picture");
}

function toggleFullscreen(video) {
	var video = document.querySelector("video");
	if (fullscreenElement()) {
		exitFullscreen();
		if (!video.paused) {
			video.pause();
		}
	} else {
		exitPictureInPicture(video);
		requestFullscreen(video);
		if (video.paused) {
			video.play();
		}
	}
}

function togglePIP(video) {
	if (isPictureInPicture(video)) {
		exitPictureInPicture(video);
	} else {
		exitFullscreen();
		requestPictureInPicture(video);
	}
}

// Persistence ID does not include hash or search parts of the URL
function getPID() {
	var pid = document.location.pathname;
	
	if (pid.endsWith("/index.html")) {
		pid = pid.substr(0, pid.length - "index.html".length);
	}
	if (!pid.endsWith("/")) {
		pid = pid + "/";
	}

	let params = new URLSearchParams(document.location.search);
	let storageKey = params.get('s');
	if (storageKey) {
		pid = pid + storageKey.toLowerCase() + "/";
	}

	return pid;
}

function seconds_to_hhmmss(t) {
	if (isNaN(t)) return '-:--';
	var h = parseInt(t / 3600);
	var m = parseInt(t / 60) % 60;
	var s = parseInt(t % 60);
	return (h ? h + ':' : '') + (h ? ('0' + m).slice(-2) : m) + ':' + ('0' + s).slice(-2);
}

function init() {
	var video = document.querySelector("video");
	
	if (!video) {
		return;
	}

	evid = new EnhancedVideo(video);
	
	var params = new URLSearchParams(document.location.search);

	var pid = getPID();

	var currentTime;
	
	// Get the start position from the URL search params if provided
	var timeFromURL = params.get('t');
	if (timeFromURL) {
		var m = timeFromURL.match(/^(\d+)m(\d+)s?$/i);
		if (m) {
			var minutes = parseFloat(m[1]);
			var seconds = parseFloat(m[2]);
			currentTime = minutes * 60.0 + seconds;
		}
	}

	// Get the start position from the URL bookmark if provided
	{
		var m = document.location.hash.match(/^#t=(\d+)m(\d+)s?$/i);
		if (m) {
			var minutes = parseFloat(m[1]);
			var seconds = parseFloat(m[2]);
			currentTime = minutes * 60.0 + seconds;
		}
	}
	
	// Read the video position from local storage if URL didn't specify a time
	if (!currentTime) {
		var ct = JSON.parse(localStorage.getItem(pid + "currentTime"));
		if (ct) {
			currentTime = ct.currentTime;
		}
	}
	
	if (currentTime) {
		var isInitialTimeSet = false;
		function setInitialTime(event) {
			if (!isInitialTimeSet) {
				video.currentTime = currentTime;
				isInitialTimeSet = true;
			}
		}
		video.addEventListener('canplay', setInitialTime);
		video.addEventListener('canplaythrough', setInitialTime);
	}
	
	var p = document.location.pathname.split("/");
	var parentPID = p.slice(0, p.length - 2).join("/") + "/";

	// Notify the parent that a new item is being played
	video.addEventListener('play', (event) => {
		document.body.setAttribute("data-playing", "true");

		var data = JSON.stringify({
			title: document.title,
			href: document.location.href,
			parent: parentPID,
			persistenceID: pid,
			date: new Date(),
		});

		localStorage.setItem(parentPID + "latest", data);
		localStorage.setItem(":root/" + "latest", data);
	});

	video.addEventListener('pause', (event) => {
		// Hide the subtitles
		evid.subtitleRuleVisible = false;
	});

	function displayElapsed() {
		var elapsed = document.querySelector(".elapsed");
		if (elapsed) {
			elapsed.innerHTML = `<span class="currentTime">${video.currentTime > 0 ? seconds_to_hhmmss(video.currentTime) : ""}</span><span class="duration">${seconds_to_hhmmss(video.duration)}</span>`;
		}
	}

	video.addEventListener('loadedmetadata', (event) => {
		displayElapsed();
	});
		
	
	video.addEventListener('timeupdate', (event) => {
		// Update the UI with the current time
		displayElapsed();
		
		// Write the video position to local storage
		localStorage.setItem(pid + "currentTime", JSON.stringify(
			{ currentTime: video.currentTime, duration: video.duration }
		));

		// If at the end of video, update the UI
		if (video.currentTime === video.duration) {
			document.body.setAttribute("data-playing", "false");
			exitFullscreen();
		}
	});
	
	document.onkeydown = function onkeydown(evt) {
		evt = evt || window.event;
		var handled = false;
		
		// console.log(evt);
		if (evt.keyCode == 32) { // SPACE
			if (!evt.getModifierState("Shift")) {
				evid.togglePlay();
			} else {   
				evid.cycleSubtitle();
			}
			handled = true;
		} else if (evt.keyCode == 13) { // ENTER
			if (!evt.getModifierState("Shift")) {
				toggleFullscreen(video);
			} else {
				togglePIP(video);
			}
			handled = true;
		} else if (evt.key === "Backspace") {
			window.history.back();
			handled = true;
		} else if (evt.key === "ArrowRight") {
			video.currentTime += 30.0;
			handled = true;
		} else if (evt.key === "ArrowLeft") {
			if (!evt.getModifierState("Shift")) {
				video.currentTime -= 15.0;
			} else {
				video.currentTime = 0.0;
			}
			handled = true;
		} else if ((evt.key === "ClosedCaptionToggle") || (evt.key === "s")) {
			evid.subtitleUserVisible = !evid.subtitleUserVisible;
			handled = true;
		}
		
		if (handled) {
			evt.stopPropagation();
			evt.preventDefault();
		}
	};

	function onhashchange() {
		var m = document.location.hash.match(/^#t=(\d+)m(\d+)s?$/i);
		if (m) {
			var minutes = parseFloat(m[1]);
			var seconds = parseFloat(m[2]);
			var currentTime = minutes * 60.0 + seconds;
			video.currentTime = currentTime;
		}
	}

	window.addEventListener('hashchange', onhashchange, false);
}

ready(init);
