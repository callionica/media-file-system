// ALL RIGHTS RESERVED
// A simplified interface for generating web responses

type OC = any & { isNil(): boolean };
type NSString = OC & { js: string };
type NSDictionary = OC & { js: any };
type NSArray<T> = OC & { js: T[] };
type NSURL = OC;
type NSURLCache = OC;
type NSURLResponse = OC;
type NSError = OC & { description: NSString };

type WKURLSchemeHandler = OC;
type WKWebView = OC;

declare const console: any;

type WebSchemeResponse = {
    status: number,
    headers: { [key: string]: string },
    data: NSData,
};

interface WebScheme {
    getResponse(url: string): Promise<WebSchemeResponse>;
}

// Route requests by using the scheme or the first path component
class WebSchemeRouter implements WebScheme {
    schemes: { [key: string]: WebScheme };

    constructor(schemes: { [key: string]: WebScheme }) {
        this.schemes = schemes;
    }

    getResponse(url: string): Promise<WebSchemeResponse> {
        let nsurl = $.NSURL.URLWithString(url);
        let scheme = this.schemes[nsurl.scheme.js];

        if (scheme === undefined) {

            function unwrap(arr: NSArray<NSString>): string[] {
                return arr.js.map((x: NSString) => x.js);
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

function createSchemeHandler(scheme: WebScheme): WKURLSchemeHandler {

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView: any, task: any) {
        let nsurl = task.request.URL;
        let url: string = nsurl.absoluteString.js;

        scheme.getResponse(url).then(response => {
            let httpHeaders = $(response.headers);
            let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(nsurl, response.status, $(), httpHeaders);

            task.didReceiveResponse(httpResponse);
            task.didReceiveData(response.data);
            task.didFinish;
        });
    }

    let workQueue = $.NSOperationQueue.alloc.init;

    function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView: any, task: any) {
        workQueue.addOperationWithBlock(function () {
            try {
                WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task);
            } catch (e) {
                // task.didFailWithError($.NSError.errorWithDomainCodeUserInfo($.kCFErrorDomainCFNetwork, $.kCFURLErrorUnknown, $()));
            }
        });
    }

    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView: any, task: any) {
        // Nothing to do here
    }

    let local = createSchemeHandler as { count?: number };
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