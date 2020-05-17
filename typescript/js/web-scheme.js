"use strict";
// ALL RIGHTS RESERVED
// A simplified interface for generating web responses in a single pass
;
;
;
;
;
;
;
;
;
;
;
function allHeaders(requestOrResponse) {
    function unwrap(d) {
        return fromEntries(Object.entries(d.js), v => v.js);
    }
    return unwrap(requestOrResponse.allHeaderFields || requestOrResponse.allHTTPHeaderFields);
}
const nohost = "_";
function unwrapURL(url) {
    function unwrap(arr) {
        return arr.js.map(x => x.js);
    }
    let nsurl = $.NSURL.URLWithString(url);
    let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(nsurl, true);
    let pathComponents = unwrap(nsurl.path.pathComponents);
    let scheme = pathComponents[1];
    let host = pathComponents[2];
    if (host == nohost) {
        host = "";
    }
    let path = pathComponents[0] + pathComponents.slice(3).join("/");
    components.scheme = $(scheme);
    components.host = $(host);
    components.path = $(path);
    return { scheme, url: components.URL.absoluteString.js };
}
function wrapURL(url) {
    function unwrap(arr) {
        return arr.js.map(x => x.js);
    }
    let nsurl = $.NSURL.URLWithString(url);
    let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(nsurl, true);
    let pathComponents = unwrap(nsurl.path.pathComponents);
    let host = components.host.js;
    if (host == "") {
        host = nohost;
    }
    let path = `/${components.scheme.js}/${host}/` + pathComponents.slice(1).join("/");
    components.scheme = $("app");
    components.host = $("callionica.com");
    components.path = $(path);
    return components.URL.absoluteString.js;
}
// Route requests by using the scheme or the first path component
class WebSchemeRouter {
    constructor(schemes) {
        this.schemes = schemes;
    }
    getResponse(request) {
        let target = unwrapURL(request.url);
        let scheme = this.schemes[target.scheme];
        if (scheme === undefined) {
            return Promise.reject("No scheme");
        }
        let request2 = Object.assign(Object.assign({}, request), { url: target.url });
        return scheme.getResponse(request2);
    }
}
function createSchemeHandler(scheme) {
    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let nsurl = task.request.URL;
        let url = nsurl.absoluteString.js;
        let headers = allHeaders(task.request);
        scheme.getResponse({ url, headers }).then(response => {
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