"use strict";
class KeyboardCommand {
    constructor(name, shortcut, action) {
        this.name = name;
        this.shortcut = shortcut;
        this.enabled = true;
        this.action = action;
    }
}
class Control {
    constructor() {
        this.keyboardDisabled = false;
    }
}
// Takes a member function and makes it into a command handler
function command(o, key) {
    return (shortcut) => {
        console.log(shortcut, key);
        if (!o.keyboardDisabled) {
            o[key]();
            return true;
        }
        return false;
    };
}
function toShortcut(event) {
    function adjustKey(key) {
        const replacements = {
            " ": "Space",
            "Backspace": "Delete",
            "Enter": "Enter",
            "Meta": "",
            "Control": "",
            "Alt": "",
            "Shift": "",
            "ArrowUp": "↑",
            "ArrowDown": "↓",
            "ArrowLeft": "←",
            "ArrowRight": "→",
        };
        let replacement = replacements[key];
        if (replacement !== undefined) {
            return replacement;
        }
        return key.toUpperCase();
    }
    let command = event.metaKey ? "⌘" : "";
    let control = event.ctrlKey ? "^" : "";
    let alt = event.altKey ? "⌥" : "";
    let shift = event.shiftKey ? "⇧" : "";
    let key = adjustKey(event.key);
    return `${command}${control}${alt}${shift}${key}`;
}
class KeyboardController {
    constructor() {
        this.enableLogging = false;
        this.commands = [];
        this.commandsVisible = false;
        this.commandsVisibleTimeout = undefined;
        this.commands.push(new KeyboardCommand("Keyboard: Logging on/off", "L", command(this, "toggleLogging")));
    }
    toggleLogging() {
        this.enableLogging = !this.enableLogging;
    }
    showCommands() {
        // console.log("Commands:", JSON.stringify(this.commands, null, 2));
        console.log("Commands:", this.commands);
    }
    hideCommands() {
        console.log("Commands: hide");
    }
    hideCommands_() {
        clearTimeout(this.commandsVisibleTimeout);
        this.commandsVisibleTimeout = undefined;
        if (this.commandsVisible) {
            this.commandsVisible = false;
            this.hideCommands();
            return true;
        }
        return false;
    }
    showCommands_() {
        if (!this.commandsVisible && this.commandsVisibleTimeout == undefined) {
            this.commandsVisibleTimeout = setTimeout(() => {
                this.commandsVisibleTimeout = undefined;
                this.commandsVisible = true;
                this.showCommands();
            }, 2 * 1000);
        }
    }
    onkeydown(event) {
        let shortcut = toShortcut(event);
        if (this.enableLogging) {
            console.log("onkeydown", event, shortcut);
        }
        let handled = this.hideCommands_();
        if (!handled) {
            if (shortcut == "^") {
                this.showCommands_();
                return;
            }
            let commands = this.commands.filter(command => command.enabled && (command.shortcut === shortcut));
            for (let command of commands) {
                handled = true;
                if (command.action(shortcut)) {
                    break;
                }
            }
        }
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    onkeyup(event) {
        let shortcut = toShortcut(event);
        if (this.enableLogging) {
            console.log("onkeyup", event, shortcut);
        }
        this.hideCommands_();
    }
}
//# sourceMappingURL=keyboard.js.map"use strict";
// Switching the environment:
// - sets data-environment-id attribute on body
// - sets innerText of element with id="environment"
// - creates an isolated data storage environment
function setText(selector, value) {
    let e = document.querySelector(selector);
    if (e) {
        e.innerText = value;
    }
    return e || undefined;
}
class Environment {
    constructor(id = "0") {
        this.pageID = this.getPageID_();
        this.id = localStorage.getItem(this.getPageID_() + "environment") || id;
        this.updatePage();
        this.commands = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map(key => {
            let name = "Environment: " + key;
            let shortcut = "" + key;
            return new KeyboardCommand(name, shortcut, (s) => this.switchTo(key));
        });
    }
    getPageID_() {
        var pid = document.location.pathname;
        if (pid.endsWith("/index.html")) {
            pid = pid.substr(0, pid.length - "index.html".length);
        }
        if (!pid.endsWith("/")) {
            pid = pid + "/";
        }
        return pid;
    }
    getKey_(item) {
        return this.id + "/" + this.pageID + item;
    }
    switchTo(id) {
        this.id = id;
        localStorage.setItem(this.getPageID_() + "environment", id);
        this.updatePage();
        return true;
    }
    setItem(item, value) {
        let key = this.getKey_(item);
        let json = JSON.stringify(value, null, 2);
        localStorage.setItem(key, json);
    }
    getItem(item) {
        let key = this.getKey_(item);
        let json = localStorage.getItem(key);
        if (json != null) {
            return JSON.parse(json);
        }
        return undefined;
    }
    updatePage() {
        setText("#environment", this.id);
        document.body.setAttribute("data-environment-id", this.id);
    }
}
//# sourceMappingURL=environment.js.map"use strict";
class List extends Control {
    constructor() {
        super();
        this.commands = [
            new KeyboardCommand("List: Back", "Delete", command(this, "back")),
            new KeyboardCommand("List: Forward", "⇧Delete", command(this, "forward")),
            new KeyboardCommand("List: Previous item", "↑", command(this, "previous")),
            new KeyboardCommand("List: Next item", "↓", command(this, "next")),
            new KeyboardCommand("List: First item", "⌘↑", command(this, "first")),
            new KeyboardCommand("List: Last item", "⌘↓", command(this, "last")),
            new KeyboardCommand("List: Activate item", "Enter", command(this, "activate")),
        ];
    }
    back() {
    }
    forward() {
    }
    previous() {
    }
    next() {
    }
    first() {
    }
    last() {
    }
    activate() {
    }
}
//# sourceMappingURL=list.js.map"use strict";
class Player extends Control {
    constructor() {
        super();
        this.commands = [
            new KeyboardCommand("Player: Play/pause", "Space", command(this, "playPause")),
            new KeyboardCommand("Player: Play/pause", "F8", command(this, "playPause")),
            new KeyboardCommand("Player: Jump forward", "→", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump forward", "F9", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump to end", "⇧→", command(this, "jumpEnd")),
            new KeyboardCommand("Player: Jump back", "←", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump back", "F7", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump to start", "⇧←", command(this, "jumpStart")),
            new KeyboardCommand("Player: Volume up", "⇧↑", command(this, "volumeUp")),
            new KeyboardCommand("Player: Volume down", "⇧↓", command(this, "volumeDown")),
            new KeyboardCommand("Player: Subtitles on/off", "S", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Subtitles on/off", "ClosedCaptionToggle", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Next subtitle", "⇧S", command(this, "nextSubtitle")),
            new KeyboardCommand("Player: Picture-in-picture on/off", "P", command(this, "togglePIP")),
        ];
    }
    playPause() {
    }
    volumeUp() {
    }
    volumeDown() {
    }
    toggleSubtitles() {
    }
    nextSubtitle() {
    }
    jumpForward() {
    }
    jumpBack() {
    }
    jumpStart() {
    }
    jumpEnd() {
    }
    togglePIP() {
    }
}
//# sourceMappingURL=player.js.map"use strict";
class App {
    constructor() {
        this.environment = new Environment();
        this.list = new List();
        this.player = new Player();
        this.commands = [
            new KeyboardCommand("App: Video", "V", command(this, "video")),
            new KeyboardCommand("App: Weather", "W", command(this, "showWeather")),
            new KeyboardCommand("App: Time", "T", command(this, "showTime")),
        ];
        this.keyboardController = (() => {
            let keyboardController = new KeyboardController();
            keyboardController.commands.push(...this.environment.commands);
            keyboardController.commands.push(...this.commands);
            keyboardController.commands.push(...this.list.commands);
            keyboardController.commands.push(...this.player.commands);
            document.onkeydown = (e) => keyboardController.onkeydown(e);
            document.onkeyup = (e) => keyboardController.onkeyup(e);
            return keyboardController;
        })();
    }
    showWeather() {
    }
    showTime() {
    }
    video() {
        let player = document.getElementById("player");
        let layout = player.getAttribute("data-layout") || "maxi";
        if (layout != "mini") {
            layout = "mini";
        }
        else {
            layout = "maxi";
        }
        player.setAttribute("data-layout", layout);
    }
}
//# sourceMappingURL=app.js.map"use strict";
function ready(callback) {
    if (document.readyState != "loading") {
        callback();
    }
    else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', callback);
    }
}
let app;
function init() {
    app = new App();
}
ready(init);
//# sourceMappingURL=ready.js.map