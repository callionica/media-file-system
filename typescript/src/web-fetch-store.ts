// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available
// and even if the connection is available, but the server returns an error.

type FetchStoreResult = {
    path: string;
    headers: { [key: string]: string };
    retrievalDate: string; // ISO date time
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

        let { nsurl, path, dataPath, headersPath } = locations;
        let promise = new Promise<FetchStoreResult>((resolve, reject) => {
            function handler(data: any, response: any, error: any) {
                if (!error.isNil()) {
                    reject(error);
                } else {
                    createDirectory(path);

                    data.writeToFileAtomically(dataPath, true);

                    let headers = getHeaders(response);
                    writeJSON(headersPath, headers);

                    let retrievalDate = new Date().toISOString();
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

        return { path, dataPath, headersPath, extension, nsurl };
    }

    // fetch will always make a request through the HTTP system
    // even if the document already exists in the store.
    // The request may not make it all the way to the server if the document is
    // in the HTTP cache and still valid.
    // A successful response updates the document in the store.
    async fetch(url: string): Promise<FetchStoreResult> {
        return this.fetch_(this.getLocations(url));
    }

    // fetchStore will always return the document found in the store
    // unless the document does not exist or could not be read,
    // in which case it behaves like fetch.
    async fetchStore(url: string): Promise<FetchStoreResult> {

        let locations = this.getLocations(url);
        let { nsurl, path, dataPath, headersPath } = locations;

        let dataExists = $.NSFileManager.defaultManager.fileExistsAtPath(dataPath);
        if (dataExists) {
            try {
                let error = $();
                let retrievalDate = new Date("2001-01-01").toISOString();
                let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(dataPath, error);
                if (attrs && error.isNil()) {
                    retrievalDate = attrs.fileModificationDate.js.toISOString();
                }

                let headers = readJSON(headersPath, { "Content-Type": "text/plain; charset=utf-8" });
                return { path: dataPath, headers, retrievalDate };
            } catch (e) {
            }
        }

        // If we're here, one of the following is true:
        //   The document doesn't exist in the store
        //   The document attributes could not be read
        //   Some unexpected error
        // In any case, we'll make a request and create/refresh the document
        return this.fetch_(locations);
    }
}