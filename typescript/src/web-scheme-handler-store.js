// ALL RIGHTS RESERVED

function WebSchemeHandlerStore(store, fileHandler) {
    let workQueue = $.NSOperationQueue.alloc.init;

    function changeScheme(url, scheme) {
        let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(url, true);
        components.scheme = scheme;

        function unwrap(arr) {
            return arr.js.map(x => x.js);
        }

        let prefixes = ["web:", "https:", "store:"];
        let pathComponents = unwrap(components.path.pathComponents);
        if (prefixes.includes(pathComponents[1])) {
            let host = pathComponents[2];
            let path = pathComponents[0] + pathComponents.slice(3).join("/");
            components.host = host;
            components.path = path;
        }

        return components.URL;
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let requestURL = task.request.URL;
        let dataURL = changeScheme(requestURL, "https");
        let url = dataURL.absoluteString.js;
        store.read(url, { hours: 24 }).then(result => {
            let origin = `${appscheme}://${apphost}`;
            let fileURL = origin + "/file/" + result.path;
            file.webViewStartURLSchemeTask(webView, task);
        });
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView, task) {
        workQueue.addOperationWithBlock(function () {
            try {
                WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task);
            } catch (e) {
                // task.didFailWithError($.NSError.errorWithDomainCodeUserInfo($.kCFErrorDomainCFNetwork, $.kCFURLErrorUnknown, $()));
                console.log(e);
            }
        });
    }

    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
        // Nothing to do here
    }

    let className = "CalliURLSchemeHandlerStore";
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
