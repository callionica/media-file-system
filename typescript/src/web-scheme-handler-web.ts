// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES UNRESTRICTED ACCESS TO THE WEB.

// An implementation of WKURLSchemeHandler that makes https requests,
// but adds CORS headers to the response to allow cross-origin fetch to work
// Access-Control-Allow-Origin: *

class WSHWeb implements WebScheme {
    session: any;

    constructor(cache = $.NSURLCache.sharedURLCache) {
        function createSession() {
            let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
            configuration.waitsForConnectivity = true
            configuration.URLCache = cache;
            return $.NSURLSession.sessionWithConfiguration(configuration);
        }
        this.session = createSession();
    }

    getResponse(url: string): Promise<WebSchemeResponse> {
        let session = this.session;

        function createDataTask(url: NSURL, handler: any) {
            let policy = $.NSURLRequestUseProtocolCachePolicy;
            let timeout = 60.0; // seconds
            let request = $.NSURLRequest.requestWithURLCachePolicyTimeoutInterval(url, policy, timeout);
            return session.dataTaskWithRequestCompletionHandler(request, handler);
        }

        function changeScheme(url: any, scheme: any) {
            let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(url, true);
            components.scheme = scheme;

            function unwrap(arr: any) {
                return arr.js.map((x: any) => x.js);
            }

            let prefixes = ["web:", "https:"];
            let pathComponents = unwrap(components.path.pathComponents);
            if (prefixes.includes(pathComponents[1])) {
                let host = pathComponents[2];
                let path = pathComponents[0] + pathComponents.slice(3).join("/");
                components.host = host;
                components.path = path;
            }

            return components.URL;
        }

        return new Promise<WebSchemeResponse>((resolve, reject) => {
            function handler(data: NSData, response: NSURLResponse, error: NSError) {
                if (!error.isNil()) {
                    reject(error.description.js);
                    return;
                }

                function unwrap(d: NSDictionary): { [key: string]: string } {
                    return fromEntries(d.js, v => v.js);
                }

                let status = response.statusCode;
                let headers = unwrap(response.allHeaderFields);

                // Allow any origin
                headers["Access-Control-Allow-Origin"] = "*";

                // Don't return STS to caller
                delete headers["Strict-Transport-Security"];

                resolve({ status, headers, data });
            }

            let dataURL = changeScheme(url, "https");
            let dataTask = createDataTask(dataURL, handler);
            dataTask.resume;
        });
    }
}

// function WebSchemeHandlerWeb(cache = $.NSURLCache.sharedURLCache) {
//     return createSchemeHandler(new WSHWeb(cache));
// }

// function WebSchemeHandlerWeb(cache = $.NSURLCache.sharedURLCache) {
//     let workQueue = $.NSOperationQueue.alloc.init;
//     let session = createSession();

//     function createSession() {
//         let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
//         configuration.waitsForConnectivity = true
//         configuration.URLCache = cache;
//         return $.NSURLSession.sessionWithConfiguration(configuration);
//     }

//     function createDataTask(url: any, handler: any) {
//         let policy = $.NSURLRequestUseProtocolCachePolicy;
//         let timeout = 60.0; // seconds
//         let request = $.NSURLRequest.requestWithURLCachePolicyTimeoutInterval(url, policy, timeout);
//         return session.dataTaskWithRequestCompletionHandler(request, handler);
//     }

//     function changeScheme(url: any, scheme: any) {
//         let components = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(url, true);
//         components.scheme = scheme;

//         function unwrap(arr: any) {
//             return arr.js.map((x: any) => x.js);
//         }

//         let prefixes = ["web:", "https:"];
//         let pathComponents = unwrap(components.path.pathComponents);
//         if (prefixes.includes(pathComponents[1])) {
//             let host = pathComponents[2];
//             let path = pathComponents[0] + pathComponents.slice(3).join("/");
//             components.host = host;
//             components.path = path;
//         }

//         return components.URL;
//     }

//     function WKURLSchemeHandler_webViewStartURLSchemeTask(webView: WKWebView, task: any) {
//         // Could be better with a task delegate to feed data through incrementally
//         // but given our use case, doing a one-shot download and passthrough seems simpler

//         let url = task.request.URL;

//         function handler(data: any, response: any, error: any) {
//             if (!error.isNil()) {
//                 try {
//                     task.didFailWithError(error);
//                 } catch (e) {
//                     console.log(e);
//                 }
//                 return;
//             }

//             let mimeType = response.MIMEType;
//             let statusCode = response.statusCode;
//             let headers = {
//                 ...(response.allHeaderFields.js),
//                 "Access-Control-Allow-Origin": "*",
//             };

//             // Don't return STS to caller
//             delete headers["Strict-Transport-Security"];

//             // console.log(Object.values(headers).length, Object.keys(headers), JSON.stringify(headers, null, 2));
//             // console.log(response.allHeaderFields.description.js);

//             let httpHeaders = $(headers);
//             // console.log(httpHeaders.description.js);
//             let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, statusCode, $(), httpHeaders);

//             task.didReceiveResponse(httpResponse);
//             task.didReceiveData(data);
//             task.didFinish;
//         }

//         let dataURL = changeScheme(url, "https");
//         let dataTask = createDataTask(dataURL, handler);
//         dataTask.resume;
//     }

//     function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView: WKWebView, task: any) {
//         workQueue.addOperationWithBlock(function () {
//             try {
//                 WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task);
//             } catch (e) {
//                 // task.didFailWithError($.NSError.errorWithDomainCodeUserInfo($.kCFErrorDomainCFNetwork, $.kCFURLErrorUnknown, $()));
//                 console.log(e);
//             }
//         });
//     }

//     function WKURLSchemeHandler_webViewStopURLSchemeTask(webView: WKWebView, task: any) {
//         // Nothing to do here
//     }

//     let className = "CalliURLSchemeHandlerWeb";
//     if (!$[className]) {
//         ObjC.registerSubclass({
//             name: className,
//             // protocols: ['WKURLSchemeHandler'],
//             methods: {
//                 'webView:startURLSchemeTask:': {
//                     types: ["void", ["id", "id"]],
//                     implementation: WKURLSchemeHandler_webViewStartURLSchemeTaskQ,
//                 },
//                 'webView:stopURLSchemeTask:': {
//                     types: ["void", ["id", "id"]],
//                     implementation: WKURLSchemeHandler_webViewStopURLSchemeTask,
//                 }
//             }
//         });
//     }

//     let handler = $[className].alloc.init;
//     return handler;
// }
