"use strict";
// ALL RIGHTS RESERVED
// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES UNRESTRICTED ACCESS TO THE WEB.
// An implementation of WKURLSchemeHandler that makes https requests,
// but adds CORS headers to the response to allow cross-origin fetch to work
// Access-Control-Allow-Origin: *
class WebSchemeWeb {
    constructor(cache = $.NSURLCache.sharedURLCache) {
        function createSession(cache) {
            let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
            configuration.waitsForConnectivity = true;
            configuration.URLCache = cache;
            return $.NSURLSession.sessionWithConfiguration(configuration);
        }
        this.session = createSession(cache);
    }
    getResponse(request) {
        let session = this.session;
        function createDataTask(url, handler) {
            let policy = $.NSURLRequestUseProtocolCachePolicy;
            let timeout = 60.0; // seconds
            let request = $.NSMutableURLRequest.requestWithURLCachePolicyTimeoutInterval(url, policy, timeout);
            request.setValueForHTTPHeaderField(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15`, "User-Agent");
            return session.dataTaskWithRequestCompletionHandler(request, handler);
        }
        return createMainQueuePromise((resolve, reject) => {
            function handler(data, response, error) {
                if (!error.isNil()) {
                    reject(error.description.js);
                    return;
                }
                let status = parseInt(response.statusCode, 10);
                let headers = allHeaders(response);
                // Allow any origin
                headers["Access-Control-Allow-Origin"] = "*";
                // Don't return STS to caller
                delete headers["Strict-Transport-Security"];
                resolve({ url: response.URL.absoluteString.js, status, headers, data });
            }
            let dataURL = $.NSURL.URLWithString(request.url);
            let dataTask = createDataTask(dataURL, handler);
            dataTask.resume;
        });
    }
}
//# sourceMappingURL=web-scheme-web.js.map