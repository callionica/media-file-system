"use strict";
// Switching the environment:
// - sets data-environment-id attribute on body
// - sets innerText of element with id="environment"
// - creates an isolated data storage environment
function setText(selector, value) {
    let e = document.querySelector(selector);
    if (e) {
        e.innerText = value;
    }
    return e || undefined;
}
class Environment {
    constructor(id = "0") {
        this.pageID = this.getPageID_();
        this.id = localStorage.getItem(this.getPageID_() + "environment") || id;
        this.updatePage();
        this.commands = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map(key => {
            let name = "Environment: " + key;
            let shortcut = "" + key;
            return new KeyboardCommand(name, shortcut, (s) => this.switchTo(key));
        });
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
        localStorage.setItem(this.getPageID_() + "environment", id);
        this.updatePage();
        return true;
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
    updatePage() {
        setText("#environment", this.id);
        document.body.setAttribute("data-environment-id", this.id);
    }
}
//# sourceMappingURL=environment.js.map