"use strict";
class Environment {
    constructor(id = "0") {
        this.id = id;
        this.pageID = this.getPageID_();
    }
    getPageID_() {
        var pid = document.location.pathname;
        if (pid.endsWith("/index.html")) {
            pid = pid.substr(0, pid.length - "index.html".length);
        }
        if (!pid.endsWith("/")) {
            pid = pid + "/";
        }
        return pid;
    }
    getKey_(item) {
        return this.id + "/" + this.pageID + item;
    }
    switchTo(id) {
        this.id = id;
    }
    setItem(item, value) {
        let key = this.getKey_(item);
        let json = JSON.stringify(value, null, 2);
        localStorage.setItem(key, json);
    }
    getItem(item) {
        let key = this.getKey_(item);
        let json = localStorage.getItem(key);
        if (json != null) {
            return JSON.parse(json);
        }
        return undefined;
    }
}
const environment = new Environment();
//# sourceMappingURL=environment.js.map