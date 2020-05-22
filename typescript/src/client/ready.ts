function ready(callback: () => void) {
    if (document.readyState != "loading") {
        callback();
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', callback);
    }
}

let app: App;

function init() {
    app = new App();
}

ready(init);