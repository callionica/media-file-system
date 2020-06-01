"use strict";
function fromEntries(entries, transform = (x) => x) {
    let result = {};
    for (let [key, value] of entries) {
        result[key] = transform(value);
    }
    return result;
}
function toMilliseconds(duration) {
    const factors = {
        milliseconds: 1,
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
    };
    const get = (k) => (duration[k] === undefined) ? 0 : (duration[k] * factors[k]);
    return get("days") + get("hours") + get("minutes") + get("seconds") + get("milliseconds");
}
function createDirectory(path) {
    var d = $.NSDictionary.alloc.init;
    var url = $.NSURL.alloc.initFileURLWithPath(path);
    $.NSFileManager.defaultManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(url, true, d, null);
}
// Read a UTF8 file and parse it as JSON
// Any failures are ignored and the default value is returned instead
function readJSON(path, _default = {}) {
    try {
        let data = $.NSFileManager.defaultManager.contentsAtPath(path); // NSData
        let contents = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
        if (contents.isNil()) {
            contents = $.NSString.alloc.initWithDataEncoding(data, $.NSWindowsCP1252StringEncoding);
        }
        if (contents.isNil()) {
            contents = $.NSString.alloc.initWithDataEncoding(data, $.NSMacOSRomanStringEncoding);
        }
        return JSON.parse(contents.js);
    }
    catch (e) {
    }
    return _default;
}
function writeJSON(path, value) {
    let json = JSON.stringify(value, null, 2);
    let error = $();
    $(json).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, error);
}
function log(...args) {
    log.count++;
    writeJSON(`/Users/user/Desktop/__current/LOG${log.count}.txt`, args);
}
log.count = 0;
function readData(path, offset, length) {
    function seek(handle, offset) {
        if (handle.seekToOffsetError) {
            let error = $();
            return handle.seekToOffsetError(offset, error);
        }
        handle.seekToFileOffset(offset);
        return (handle.offsetInFile == offset);
    }
    function read(handle, length) {
        if (handle.readDataUpToLengthError) {
            let error = $();
            return handle.readDataUpToLengthError(length, error);
        }
        return handle.readDataOfLength(length);
    }
    let handle = $.NSFileHandle.fileHandleForReadingAtPath($(path));
    if (seek(handle, offset)) {
        return read(handle, length);
    }
}
// The arguments to your promise handler enqueue resolve/reject on the main queue/thread
function createMainQueuePromise(handler) {
    return new Promise((resolve_, reject_) => {
        const resolve = (result) => {
            $.NSOperationQueue.mainQueue.addOperationWithBlock(function () {
                resolve_(result);
            });
        };
        const reject = (reason) => {
            $.NSOperationQueue.mainQueue.addOperationWithBlock(function () {
                reject_(reason);
            });
        };
        handler(resolve, reject);
    });
}
function removePrefix(text, prefix) {
    if (prefix.length && text.startsWith(prefix)) {
        return text.substring(prefix.length);
    }
    return text;
}
function mimeTypeForExtension(extension) {
    let ext = extension.toLowerCase();
    let types = {
        "htm": "text/html",
        "html": "text/html",
        "css": "text/css",
        "js": "application/javascript",
        "txt": "text/plain",
        "ttml": "application/ttml+xml",
        "vtt": "text/vtt",
        "webvtt": "text/vtt",
        "srt": "text/plain",
        "opml": "text/x-opml",
        "rss": "application/rss+xml",
        "atom": "application/atom+xml",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "ts": "video/mp2t",
        "mp2": "video/mpeg",
        "mp2v": "video/mpeg",
        "mp4": "video/mp4",
        "mp4v": "video/mp4",
        "m4v": "video/x-m4v",
        "mp3": "audio/mpeg",
        "m4a": "audio/m4a",
        "m3u": "audio/x-mpegurl",
        "m3u8": "audio/x-mpegurl",
    };
    return types[ext] || "text/plain";
}
//# sourceMappingURL=utilities.js.map