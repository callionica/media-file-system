// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available.

type FetchStoreAge = Duration;

// FetchStoreResult is designed to be JSON round-trippable
// so the date is typed as a string
type FetchStoreResult = {
    path: string;
    headers: WebSchemeHeaders;
    retrievalDate: string; // ISO date time
};

type FetchStoreLocations = { path: string, dataPath: string, headersPath: string, extension: string, url: string };

class FetchStore implements WebScheme {
    // The folder containing the stored data
    path: string;

    // The object that returns file data from the store
    localScheme: WebScheme;

    // The object that returns data from the server or remote location
    remoteScheme: WebScheme;

    // The maxAge used by getResponse
    maxAge?: FetchStoreAge;

    constructor(path: string, localScheme: WebScheme, remoteScheme: WebScheme) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        createDirectory(path);

        this.path = path;

        this.localScheme = localScheme;
        this.remoteScheme = remoteScheme;
    }

    async fetch_(locations: FetchStoreLocations): Promise<FetchStoreResult> {
        let response = await this.remoteScheme.getResponse({ url: locations.url, headers: {} });
        log("fetch_", { response, locations }, typeof response.status);
        let { status, headers, data } = response;
        // TODO - 206
        const cacheableCodes = [200, 301, 302, 307, 308];
        if (cacheableCodes.includes(status)) {
            let { url, path, dataPath, headersPath } = locations;
            createDirectory(path);

            writeJSON(headersPath, headers);

            data.writeToFileAtomically(dataPath, true);

            let retrievalDate = new Date().toISOString();
            return { path: dataPath, headers, retrievalDate };
        } else {
            return await this.read_(locations);
        }
    }

    getLocations(url: string): FetchStoreLocations {
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

        return { path, dataPath, headersPath, extension, url };
    }

    // fetch will always make a request through the HTTP system
    // even if the document already exists in the store.
    // The request may not make it all the way to the server if the document is
    // in the HTTP cache and still valid.
    // A successful response updates the document in the store.
    // A failure result falls back to returning an already stored document if there is one.
    async fetch(url: string): Promise<FetchStoreResult> {
        return await this.fetch_(this.getLocations(url));
    }

    read_(locations: FetchStoreLocations): FetchStoreResult {
        let { dataPath, headersPath } = locations;

        let dataExists = $.NSFileManager.defaultManager.fileExistsAtPath(dataPath);
        if (!dataExists) {
            throw new Error("Document not in the store.");
        }

        let error = $();
        let retrievalDate = new Date("2001-01-01").toISOString();
        let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(dataPath, error);
        if (attrs && error.isNil()) {
            retrievalDate = attrs.fileModificationDate.js.toISOString();
        }

        let headers = readJSON(headersPath, { "Content-Type": "text/plain; charset=utf-8" });

        return { path: dataPath, headers, retrievalDate };
    }

    // read will return the document found in the store
    // unless the document does not exist or could not be read,
    // or unless the document is too old,
    // in which case read behaves like fetch.
    async read(url: string, maxAge?: FetchStoreAge): Promise<FetchStoreResult> {
        let locations = this.getLocations(url);
        try {
            let result = this.read_(locations);
            let date = new Date(result.retrievalDate);
            let age = Date.now().valueOf() - date.valueOf();

            let valid = (maxAge === undefined) || (age <= toMilliseconds(maxAge));

            if (valid) {
                return result;
            }
        } catch (e) {
        }

        // If we're here, one of the following is true:
        //   The document doesn't exist in the store
        //   The document attributes could not be read
        //   The document is too old
        //   Some unexpected error
        // In any case, we'll make a request and create/refresh the document
        return await this.fetch_(locations);
    }

    async getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse> {
        let result = await this.read(request.url, this.maxAge);
        let url = "file://" + result.path;
        let fileRequest = {...request, url };
        return await this.localScheme.getResponse(fileRequest);
    }
}