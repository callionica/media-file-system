// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available
// and even if the connection is available, but the server returns an error.

type FetchStoreAge = number; // milliseconds

type FetchStorePolicy = {
    returnIfYoungerThan: FetchStoreAge;
    refreshIfOlderThan: FetchStoreAge;
};

// Return stored content if downloaded in last 24 hours
// otherwise contact the server and return the newly downloaded data
const FetchStorePolicy24 = {
    returnIfYoungerThan: 24 * 60 * 60 * 1000,
    refreshIfOlderThan: 24 * 60 * 60 * 1000,
};

type FetchStoreResult = {
    path: string;
    headers: any;
    retrievalDate: Date;
};

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

//type NSFetchReturn = {data: any, response: any};

class FetchStore {
    path: string;

    session: any;

    constructor(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        createDirectory(path);

        this.path = path;

        let cache = $.NSURLCache.sharedURLCache;

        function createSession(cache: any) {
            let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
            configuration.waitsForConnectivity = true
            configuration.URLCache = cache;
            return $.NSURLSession.sessionWithConfiguration(configuration);
        }

        this.session = createSession(cache);
    }

    // NS implementation
    async fetch_(url: any, dataPath: string): Promise<FetchStoreResult> {
        function createDataTask(session: any, url: any, handler: any) {
            let policy = $.NSURLRequestUseProtocolCachePolicy;
            let timeout = 60.0; // seconds
            let request = $.NSURLRequest.requestWithURLCachePolicyTimeoutInterval(url, policy, timeout);
            return session.dataTaskWithRequestCompletionHandler(request, handler);
        }

        function getHeaders(response: any) {
            let headers = { ...(response.allHeaderFields.js) };
            for (let [key, value] of Object.entries(headers)) {
                headers[key] = ObjC.unwrap(value);
            }
            return headers;
        }

        let promise = new Promise<FetchStoreResult>((resolve, reject) => {
            function handler(data: any, response: any, error: any) {
                if (!error.isNil()) {
                    reject(error);
                } else {
                    data.writeToFileAtomically(dataPath, true);
                    let headers = getHeaders(response);
                    writeJSON(dataPath + ".headers", headers);
                    let retrievalDate = new Date();
                    let result = { path: dataPath, headers, retrievalDate };
                    resolve(result);
                }
            }

            let dataTask = createDataTask(this.session, url, handler);
            dataTask.resume;
        });

        return promise;
    }

    async fetchStore(url: string, policy: FetchStorePolicy = FetchStorePolicy24): Promise<FetchStoreResult> {
        // TODO - handle queries
        let nsurl = $.NSURL.URLWithString(url);
        let group = `${nsurl.host.js}/${nsurl.scheme.js}`;
        let item = `${nsurl.path.js}`;
        if (!item.startsWith("/")) {
            item = "/" + item;
        }

        if (item === "/") {
            item = "/(root)";
        }

        if (!item.endsWith("/")) {
            item += "/";
        }

        let path = this.path + `${group}${item}`;
        createDirectory(path);

        let extension = (nsurl.pathExtension.length == 0) ? "data" : `${nsurl.pathExtension.js}`;
        let dataPath = path + `data.${extension}`;
        let headersPath = dataPath + ".headers";

        let makeRequest = true;
        let returnLater = true;

        let result;

        let dataExists = $.NSFileManager.defaultManager.fileExistsAtPath(dataPath);
        if (dataExists) {
            try {
                let error = $();
                let retrievalDate: Date = new Date("2001-01-01");
                let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(dataPath, error);
                if (attrs && error.isNil()) {
                    retrievalDate = attrs.fileModificationDate.js;

                    let now = new Date();
                    let age = now.valueOf() - retrievalDate.valueOf();
                    makeRequest = age >= policy.refreshIfOlderThan;
                    returnLater = age >= policy.returnIfYoungerThan;
                }

                if (!returnLater) {
                    let headers = readJSON(headersPath, { "Content-Type": "text/plain; charset=utf-8" });
                    result = { path: dataPath, headers, retrievalDate };
                }
            } catch (e) {
                makeRequest = true;
                returnLater = true;
            }
        }

        let fetchPromise: Promise<FetchStoreResult> = Promise.reject(new Error("Unexpected"));

        if (makeRequest) {
            fetchPromise = this.fetch_(nsurl, dataPath);
        }

        if (!returnLater && result) {
            return result;
        }

        return fetchPromise;
    }
}