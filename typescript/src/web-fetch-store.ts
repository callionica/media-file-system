// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available.

type FetchStoreAge = number; // seconds

type FetchStorePolicy = {
    returnIfYoungerThan: FetchStoreAge;
    refreshIfOlderThan: FetchStoreAge;
};

// Returns stored content if downloaded in last 24 hours
// otherwise contacts the server and returns the newly downloaded data
const FetchStorePolicy24 = {
    returnIfYoungerThan: 24 * 60 * 60,
    refreshIfOlderThan: 24 * 60 * 60,
};

type FetchStoreResult = {
    path: string;
    retrievalDate: Date;
};

class FetchStore {
    path: string;

    constructor(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }

        this.path = path;
    }

    async fetchStore(url: string, policy: FetchStorePolicy = FetchStorePolicy24): Promise<FetchStoreResult> {
        let dataPath = this.path + "data/";
        let metadataPath = this.path + "metadata/";;
        return { path: "", retrievalDate: new Date() };
    }
}