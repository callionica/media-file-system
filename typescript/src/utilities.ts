
type Entry = [string, any];

function fromEntries<T>(entries: Entry[], transform: (value: any) => T = (x) => x): { [key: string]: T } {
    let result: any = {};
    for (let [key, value] of entries) {
        result[key] = transform(value);
    }
    return result;
}

type Duration = {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
};

function toMilliseconds(duration: Duration): number {
    const factors = {
        milliseconds: 1,
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
    };

    const get = (k: keyof Duration) => (duration[k] === undefined) ? 0 : (duration[k]! * factors[k]);

    return get("days") + get("hours") + get("minutes") + get("seconds") + get("milliseconds");
}

function createDirectory(path: string) {
    var d = $.NSDictionary.alloc.init;
    var url = $.NSURL.alloc.initFileURLWithPath(path);
    $.NSFileManager.defaultManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(url, true, d, null);
}

// Read a UTF8 file and parse it as JSON
// Any failures are ignored and the default value is returned instead
function readJSON(path: string, _default: any = {}): any {
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
    } catch (e) {
    }
    return _default;
}

function writeJSON(path: string, value: any) {
    let json = JSON.stringify(value, null, 2);
    let error = $();
    $(json).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, error);
}

function log(...args: any[]) {
    (log as any).count++;
    writeJSON(`/Users/user/Desktop/__current/LOG${(log as any).count}.txt`, args);
}
(log as any).count = 0;

function readData(path: string, offset: number, length: number): NSData | undefined {
    function seek(handle: NSFileHandle, offset: number): boolean {
        if (handle.seekToOffsetError) {
            let error = $();
            return handle.seekToOffsetError(offset, error);
        }

        handle.seekToFileOffset(offset);
        return (handle.offsetInFile == offset);
    }

    function read(handle: NSFileHandle, length: number) {
        if (handle.readDataUpToLengthError) {
            let error = $();
            return handle.readDataUpToLengthError(length, error);
        }

        return handle.readDataOfLength(length);
    }

    let handle: NSFileHandle = $.NSFileHandle.fileHandleForReadingAtPath($(path));
    if (seek(handle, offset)) {
        return read(handle, length);
    }
}

type Resolve<T> = (value?: T | PromiseLike<T>) => void;
type Reject<T> = (reason?: any) => void;
type PromiseHandler<T> = (resolve: Resolve<T>, reject: Reject<T>) => void;

// The arguments to your promise handler enqueue resolve/reject on the main queue/thread
function createMainQueuePromise<T>(handler: PromiseHandler<T>) {
    return new Promise<T>((resolve_, reject_) => {

        const resolve: Resolve<T> = (result) => {
            $.NSOperationQueue.mainQueue.addOperationWithBlock(function () {
                resolve_(result);
            });
        };

        const reject: Reject<T> = (reason: any) => {
            $.NSOperationQueue.mainQueue.addOperationWithBlock(function () {
                reject_(reason);
            });
        };

        handler(resolve, reject);
    });
}

function removePrefix(text: string, prefix: string): string {
    if (prefix.length && text.startsWith(prefix)) {
        return text.substring(prefix.length);
    }
    return text;
}

function mimeTypeForExtension(extension: string) {
    let ext = extension.toLowerCase();
    let types: { [key: string]: string; } = {
        "htm": "text/html",
        "html": "text/html",

        "css": "text/css",

        "js": "application/javascript",

        "txt": "text/plain",

        "ttml": "application/ttml+xml",
        "vtt": "text/vtt",
        "webvtt": "text/vtt",
        "srt": "text/plain",

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