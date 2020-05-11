// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES UNRESTRICTED ACCESS TO THE WEB.

// An implementation of WKURLSchemeHandler that makes https requests,
// but adds CORS headers to the response to allow cross-origin fetch to work
// Access-Control-Allow-Origin: *
function WebSchemeHandlerWeb() {
    let workQ = $.NSOperationQueue.alloc.init;

    function createSession() {
        let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
        configuration.waitsForConnectivity = true
        return $.NSURLSession.sessionWithConfiguration(configuration);
    }

    function changeScheme(url, scheme) {
        let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(url, true);
        components.scheme = scheme;
        return components.URL;
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        // TODO - would be better with a task delegate to feed data through incrementally
        let url = task.request.URL;
    
        function handler(data, response, error) {
            if (error) {
                task.didFailWithError(error);
                return;
            }

            let mimeType = response.MIMEType;
            let statusCode = response.statusCode;
            let headers = {
                ...(response.allHeaderFields.js),
                "Access-Control-Allow-Origin": "*",
            };

            let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, statusCode, $(), $(headers));

            task.didReceiveResponse(httpResponse);
            task.didReceiveData(data);
            task.didFinish;
        }

        let dataURL = changeScheme(webURL, "https");
        let session = createSession();
        let dataTask = session.dataTaskWithURLCompletionHandler(dataURL, handler);
        dataTask.resume;
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView, task) {
        workQ.addOperationWithBlock(function () {
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

    let className = "CalliURLSchemeHandlerWeb";
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
