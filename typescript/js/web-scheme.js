"use strict";
// ALL RIGHTS RESERVED
// Route requests by using the scheme or the first path component
class WebSchemeRouter {
    constructor(schemes) {
        this.schemes = schemes;
    }
    getResponse(url) {
        let nsurl = $.NSURL.URLWithString(url);
        let scheme = this.schemes[nsurl.scheme.js];
        if (scheme === undefined) {
            function unwrap(arr) {
                return arr.js.map((x) => x.js);
            }
            let pathComponents = unwrap(nsurl.path.pathComponents);
            scheme = this.schemes[pathComponents[1]];
        }
        if (scheme === undefined) {
            return Promise.reject("No scheme");
        }
        return scheme.getResponse(url);
    }
}
function createSchemeHandler(scheme) {
    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let nsurl = task.request.URL;
        let url = nsurl.absoluteString.js;
        scheme.getResponse(url).then(response => {
            let httpHeaders = $(response.headers);
            let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(nsurl, response.status, $(), httpHeaders);
            task.didReceiveResponse(httpResponse);
            task.didReceiveData(response.data);
            task.didFinish;
        });
    }
    let workQueue = $.NSOperationQueue.alloc.init;
    function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView, task) {
        workQueue.addOperationWithBlock(function () {
            try {
                WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task);
            }
            catch (e) {
                // task.didFailWithError($.NSError.errorWithDomainCodeUserInfo($.kCFErrorDomainCFNetwork, $.kCFURLErrorUnknown, $()));
            }
        });
    }
    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
        // Nothing to do here
    }
    let local = createSchemeHandler;
    local.count = (local.count === undefined) ? 1 : (local.count + 1);
    let className = `CalliURLScheme${local.count}`;
    if (!$[className]) {
        ObjC.registerSubclass({
            name: className,
            // protocols: ['WKURLSchemeHandler'],
            methods: {
                'webView:startURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: WKURLSchemeHandler_webViewStartURLSchemeTaskQ,
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
//# sourceMappingURL=web-scheme.js.map