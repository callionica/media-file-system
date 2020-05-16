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

type Resolve<T> = (value?: T | PromiseLike<T>) => void;
type Reject<T> = (reason?: any) => void;
type PromiseHandler<T> = (resolve: Resolve<T>, reject: Reject<T>) => void;

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