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

type FetchStoreLocations = { path: string, dataPath: string, headersPath: string, extension: string, nsurl: any };

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
    async fetch_(locations: FetchStoreLocations): Promise<FetchStoreResult> {

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

        let { path, nsurl, dataPath } = locations;
        let promise = new Promise<FetchStoreResult>((resolve, reject) => {
            function handler(data: any, response: any, error: any) {
                if (!error.isNil()) {
                    reject(error);
                } else {
                    createDirectory(path);

                    data.writeToFileAtomically(dataPath, true);

                    let headers = getHeaders(response);
                    writeJSON(dataPath + ".headers", headers);

                    let retrievalDate = new Date();
                    let result = { path: dataPath, headers, retrievalDate };
                    resolve(result);
                }
            }

            let dataTask = createDataTask(this.session, nsurl, handler);
            dataTask.resume;
        });

        return promise;
    }

    getLocations(url: string): { path: string, dataPath: string, headersPath: string, extension: string, nsurl: any } {
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

        return { path, dataPath, headersPath, extension, nsurl };
    }

    // fetch will always make a request through the HTTP system
    // even if the document already exists in the store.
    // The request may not make it all the way to the server if the document is
    // the HTTP cache and still valid.
    async fetch(url: string): Promise<FetchStoreResult> {
        return this.fetch_(this.getLocations(url));
    }

    // fetchStore will always return the document in the store
    // unless the document does not exist or could not be read
    async fetchStore(url: string, policy: FetchStorePolicy = FetchStorePolicy24): Promise<FetchStoreResult> {
        // TODO - handle queries
        let locations = this.getLocations(url);
        let { path, dataPath, headersPath, extension, nsurl } = locations;

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
            fetchPromise = this.fetch_(locations);
        }

        if (!returnLater && result) {
            return result;
        }

        return fetchPromise;
    }
}