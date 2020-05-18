"use strict";
// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available.
class FetchStore {
    constructor(path, localScheme, remoteScheme) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        createDirectory(path);
        this.path = path;
        this.localScheme = localScheme;
        this.remoteScheme = remoteScheme;
    }
    async fetch_(locations) {
        let { url, path, dataPath, headersPath } = locations;
        let { status, headers, data } = await this.remoteScheme.getResponse({ url, headers: {} });
        if ((200 <= status) && (status < 300)) {
            createDirectory(path);
            data.writeToFileAtomically(dataPath, true);
            writeJSON(headersPath, headers);
            let retrievalDate = new Date().toISOString();
            return { path: dataPath, headers, retrievalDate };
        }
        else {
            return await this.read_(locations);
        }
    }
    getLocations(url) {
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
    async fetch(url) {
        return await this.fetch_(this.getLocations(url));
    }
    read_(locations) {
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
    async read(url, maxAge) {
        let locations = this.getLocations(url);
        try {
            let result = this.read_(locations);
            let date = new Date(result.retrievalDate);
            let age = Date.now().valueOf() - date.valueOf();
            let valid = (maxAge === undefined) || (age <= toMilliseconds(maxAge));
            if (valid) {
                return result;
            }
        }
        catch (e) {
        }
        // If we're here, one of the following is true:
        //   The document doesn't exist in the store
        //   The document attributes could not be read
        //   The document is too old
        //   Some unexpected error
        // In any case, we'll make a request and create/refresh the document
        return await this.fetch_(locations);
    }
    async getResponse(request) {
        let result = await this.read(request.url, this.maxAge);
        let url = "file://" + result.path;
        let fileRequest = Object.assign(Object.assign({}, request), { url });
        return await this.localScheme.getResponse(fileRequest);
    }
}
//# sourceMappingURL=web-fetch-store.js.map