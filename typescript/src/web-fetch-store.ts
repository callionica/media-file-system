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
    retrievalDate: Date;
};

function createDirectory(path: string) {
	var d = $.NSDictionary.alloc.init;
	var url = $.NSURL.alloc.initFileURLWithPath(path);
	$.NSFileManager.defaultManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(url, true, d, null);
}

class FetchStore {
    path: string;

    constructor(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        createDirectory(path);

        this.path = path;
    }

    async fetchStore(url: string, policy: FetchStorePolicy = FetchStorePolicy24): Promise<FetchStoreResult> {
        // TODO - handle queries
        let nsurl = $.NSURL.URLWithString(url);
        let group = `${nsurl.scheme.js}/${nsurl.host.js}`;
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

        let extension = (nsurl.pathExtension.length == 0) ? ".data" : `.${nsurl.pathExtension.js}`;
        let dataPath = path + `data${extension}`;
        let metadataPath = path + `metadata.txt`;
        return { path: dataPath, retrievalDate: new Date() };
    }
}