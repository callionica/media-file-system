// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES TOTAL ACCESS TO THE LOCAL FILE SYSTEM.

// An implementation of WKURLSchemeHandler that gives more flexibility than the file:// scheme
// when using WKWebView to read files from the local file system. For example, using a custom
// scheme allows us to provide a default document (index.html) when the URL represents a folder.
// It also allows us to load files from multiple disks without hitting the security blocks associated
// with the file:// scheme.
function WebSchemeHandler(config) {

    // function alert(text, informationalText) {
    //     var options = {};
    //     if (informationalText) options.message = informationalText;
    //     let app = Application.currentApplication();
    //     app.displayAlert(text, options);
    // }

    // Get the file path and extension from a URL
    // adding "/index.html" if the URL is a folder
    function pathAndExtension(url) {
        let path = url.path;
        let extension = url.pathExtension;

        const separator = "/";
        function isFolder(url) {
            return url.absoluteString.js.endsWith(separator);
        }

        if (isFolder(url)) {
            extension = $("html");
            path = $(path.js + separator + "index.html");
        }

        return { path, extension };
    }

    // Standard javascript:
    function mimeTypeForExtension(extension) {
        let ext = extension.toLowerCase();
        let types = {
            "htm": "text/html",
            "html": "text/html",

            "txt": "text/plain",

            "ttml": "application/ttml+xml",
            "vtt": "text/vtt",
            "webvtt": "text/vtt",
            "srt": "text/plain",

            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",

            "ts": "video/mp2t",
            "mp2": "video/mpeg",
            "mp2v": "video/mpeg",

            "mp4": "video/mp4",
            "mp4v": "video/mp4",
            "m4v": "video/x-m4v",

            "mp3": "audio/mpeg",
            "m4a": "audio/m4a",
            "m3u": "audio/x-mpegurl",
            "m3u8": "audio/x-mpegurl",
        };
        return types[ext] || "text/plain";
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let url = task.request.URL;
        let { path, extension } = pathAndExtension(url);
        let mimeType = mimeTypeForExtension(extension.js);
        let options = $.NSDataReadingMappedIfSafe;
        let error = $();
        let data = $.NSData.dataWithContentsOfFileOptionsError(path, options, error);
        let expectedContentLength = data.length;

        // console.log(`${path.js}, ${extension.js}`);

        let response = $.NSURLResponse.alloc.initWithURLMIMETypeExpectedContentLengthTextEncodingName(url, $(mimeType), expectedContentLength, $("utf-8"));

        /*
        let headers = {
            "Content-Type": mimeType,
            "Cache-Control": "no-cache",
        };

        let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, 200, $(), $(headers));
        */

        task.didReceiveResponse(response);
        task.didReceiveData(data);
        task.didFinish();
    }

    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
        // Nothing to do here
    }

    let className = "CalliURLSchemeHandler";
    if (!$[className]) {
        ObjC.registerSubclass({
            name: className,
            // protocols: ['WKURLSchemeHandler'],
            methods: {
                'webView:startURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: WKURLSchemeHandler_webViewStartURLSchemeTask,
                },
                'webView:stopURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: WKURLSchemeHandler_webViewStopURLSchemeTask,
                }
            }
        });
    }

    let handler = $[className].alloc.init;
    return handler;
}
