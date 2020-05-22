"use strict";
function ready(callback) {
    if (document.readyState != "loading") {
        callback();
    }
    else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', callback);
    }
}
let app;
function init() {
    app = new App();
}
ready(init);
//# sourceMappingURL=ready.js.map