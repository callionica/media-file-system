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