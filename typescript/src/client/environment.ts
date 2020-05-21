class Environment {
    id: string;
    pageID: string;

    constructor(id: string = "0") {
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

    getKey_(item: string) {
        return this.id + "/" + this.pageID + item;
    }

    switchTo(id: string) {
        this.id = id;
    }

    setItem<T>(item: string, value: T) {
        let key = this.getKey_(item);
        let json = JSON.stringify(value, null, 2);
        localStorage.setItem(key, json);
    }

    getItem<T>(item: string): T | undefined {
        let key = this.getKey_(item);
        let json = localStorage.getItem(key);
        if (json != null) {
            return JSON.parse(json) as T;
        }
        return undefined;
    }
}

const environment = new Environment();