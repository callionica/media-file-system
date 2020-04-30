// ALL RIGHTS RESERVED

// An implementation of WKURLSchemeHandler that gives more flexibility than the file:// scheme
// when using WKWebView to read files from the local file system. For example, using a custom
// scheme allows us to provide a default document (index.html) when the URL represents a folder
function WebSchemeHandler(config) {

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
            extension = "html";
            path = path + separator + "index.html";
        }

        return {path, extension};
    }

    function mimeTypeForExtension(extension) {
        return "text/html"; // TODO
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let url = task.request.URL;
        let {path, extension} = pathAndExtension(url);
        let mimeType = mimeTypeForExtension(extension);
        let options = $.NSDataReadingMappedIfSafe;
        let error = $();
        let data = $.NSData.dataWithContentsOfFileOptionsError(path, options, error);
        let expectedContentLength = data.length;

        let response = $.NSURLResponse.alloc.initWithURLMIMETypeExpectedContentLengthTextEncodingName(url, mimeType, expectedContentLength, $());

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
