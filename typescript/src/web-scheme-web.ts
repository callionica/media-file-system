// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES UNRESTRICTED ACCESS TO THE WEB.

// An implementation of WKURLSchemeHandler that makes https requests,
// but adds CORS headers to the response to allow cross-origin fetch to work
// Access-Control-Allow-Origin: *

class WebSchemeWeb implements WebScheme {
    session: any;

    constructor(cache = $.NSURLCache.sharedURLCache) {
        function createSession(cache: NSURLCache) {
            let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
            configuration.waitsForConnectivity = true
            configuration.URLCache = cache;
            return $.NSURLSession.sessionWithConfiguration(configuration);
        }
        this.session = createSession(cache);
    }

    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse> {
        let session = this.session;

        function createDataTask(url: NSURL, handler: any) {
            let policy = $.NSURLRequestUseProtocolCachePolicy;
            let timeout = 60.0; // seconds
            let request = $.NSURLRequest.requestWithURLCachePolicyTimeoutInterval(url, policy, timeout);
            return session.dataTaskWithRequestCompletionHandler(request, handler);
        }

        return createMainQueuePromise<WebSchemeResponse>((resolve, reject) => {
            function handler(data: NSData, response: NSURLResponse, error: NSError) {
                if (!error.isNil()) {
                    reject(error.description.js);
                    return;
                }

                let status = response.statusCode;
                let headers = allHeaders(response);

                // Allow any origin
                headers["Access-Control-Allow-Origin"] = "*";

                // Don't return STS to caller
                delete headers["Strict-Transport-Security"];

                resolve({ status, headers, data });
            }

            let dataURL = $.NSURL.URLWithString(request.url);
            let dataTask = createDataTask(dataURL, handler);
            dataTask.resume;
        });
    }
}
