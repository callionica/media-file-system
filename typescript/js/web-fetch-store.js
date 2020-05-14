"use strict";
// FetchStore is an on-disk store of URL-sourced documents.
// Unlike a typical HTTP cache, it doesn't follow the server's instructions about caching.
// Caching is entirely under the control of the client.
// Documents that are retrieved from a web server through the FetchStore will be saved permanently.
// Documents in the FetchStore can be retrieved even if no network connection is available.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Returns stored content if downloaded in last 24 hours
// otherwise contacts the server and returns the newly downloaded data
const FetchStorePolicy24 = {
    returnIfYoungerThan: 24 * 60 * 60,
    refreshIfOlderThan: 24 * 60 * 60,
};
class FetchStore {
    constructor(path) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        this.path = path;
    }
    fetchStore(url, policy = FetchStorePolicy24) {
        return __awaiter(this, void 0, void 0, function* () {
            let dataPath = this.path + "data/";
            let metadataPath = this.path + "metadata/";
            ;
            return { path: "", retrievalDate: new Date() };
        });
    }
}
//# sourceMappingURL=web-fetch-store.js.map