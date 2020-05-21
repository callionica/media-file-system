// ALL RIGHTS RESERVED
// A simplified interface for generating web responses in a single pass

interface OC {
    isNil(): boolean;
};

type NSStringEncoding = object;

interface NSString extends OC {
    writeToFileAtomicallyEncodingError(path: string | NSString, atomic: boolean, encoding: NSStringEncoding, error: NSError): boolean;
    pathComponents: NSArray<NSString>;
    js: string;
};

interface NSDictionary extends OC {
    js: object;
};

interface NSArray<T> extends OC {
    js: T[];
};

interface NSData extends OC {
    writeToFileAtomically(path: string | NSString, atomic: boolean): boolean;
};

interface NSFileHandle extends OC {
    seekToOffsetError?(offset: number, error: NSError): boolean;
    readDataUpToLengthError?(length: number, error: NSError): NSData;

    offsetInFile: number;
    seekToFileOffset(offset: number): void;
    readDataOfLength(length: number): NSData;
};

interface NSURL extends OC {
    scheme: NSString;
    host: NSString;
    path: NSString;
    pathExtension: NSString;
    absoluteString: NSString;
};

interface NSURLComponents extends OC {
    scheme: NSString;
    host: NSString;
    path: NSString;
    URL: NSURL;
}

type NSURLCache = OC;

interface NSURLRequest extends OC {
    allHTTPHeaderFields: NSDictionary;
};

interface NSURLResponse extends OC {
    statusCode: string; // TODO - doc'd as number, but it's a string
    URL: NSURL;
    allHeaderFields: NSDictionary;
};

interface NSError extends OC {
    description: NSString;
};

type NSURLSession = OC;

interface NSDollar {
    (): NSError;
    (value: string | NSString): NSString;
    (value: object | NSDictionary): NSDictionary;
    [key: string]: any;
};

declare const $: NSDollar;

type WKURLSchemeHandler = OC;
type WKWebView = OC;

type WebSchemeHeaders = { [key: string]: string };

function allHeaders(requestOrResponse: { allHeaderFields?: NSDictionary; allHTTPHeaderFields?: NSDictionary }): WebSchemeHeaders {
    function unwrap(d: NSDictionary): WebSchemeHeaders {
        return fromEntries(Object.entries(d.js), v => v.js);
    }
    return unwrap(requestOrResponse.allHeaderFields || requestOrResponse.allHTTPHeaderFields!);
}

type WebSchemeRequest = {
    url: string,
    headers: WebSchemeHeaders,
};

type WebSchemeResponse = {
    url: string,
    status: number,
    headers: WebSchemeHeaders,
    data: NSData,
};

interface WebScheme {
    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse>;
}

type WrappedURL = string;

const appscheme = "app";
const apphost = "callionica.com";
const nohost = "_";

function unwrapURL(url: WrappedURL): { scheme: string, url: string } {
    function unwrap(arr: NSArray<NSString>) {
        return arr.js.map(x => x.js);
    }

    function schemeToProtocol(scheme: string): string {
        if (scheme === "store") {
            return "https";
        }
        return scheme;
    }

    let nsurl: NSURL = $.NSURL.URLWithString(url);

    let scheme = nsurl.scheme.js;
    if (scheme == appscheme) {
        // If it's an appscheme URL, we get the true URL from the path components
        let components: NSURLComponents = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(nsurl, true);
        let pathComponents = unwrap(nsurl.path.pathComponents);
        scheme = pathComponents[1];
        let host = pathComponents[2];
        if (host == nohost) {
            host = "";
        }
        let path = pathComponents[0] + pathComponents.slice(3).join("/");
        components.scheme = $(schemeToProtocol(scheme));
        components.host = $(host);
        components.path = $(path);

        return { scheme, url: components.URL.absoluteString.js };
    }

    // If it's not an appscheme URL, we return the URL unchanged
    return { scheme, url };
}

function wrapURL(url: string): WrappedURL {
    function unwrap(arr: NSArray<NSString>) {
        return arr.js.map(x => x.js);
    }

    let nsurl: NSURL = $.NSURL.URLWithString(url);
    let components: NSURLComponents = $.NSURLComponents.componentsWithURLResolvingAgainstBaseURL(nsurl, true);
    let pathComponents = unwrap(nsurl.path.pathComponents);
    let host = components.host.js;
    if (host == "") {
        host = nohost;
    }
    let path = `/${components.scheme.js}/${host}/` + pathComponents.slice(1).join("/");
    components.scheme = $(appscheme);
    components.host = $(apphost);
    components.path = $(path);
    return components.URL.absoluteString.js;
}

// Route requests by using the scheme or the first path component
class WebSchemeRouter implements WebScheme {
    schemes: { [key: string]: WebScheme };

    constructor(schemes: { [key: string]: WebScheme }) {
        this.schemes = schemes;
    }

    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse> {

        let target = unwrapURL(request.url);
        let scheme = this.schemes[target.scheme];

        if (scheme === undefined) {
            return Promise.reject("No scheme");
        }

        let request2 = {
            ...request,
            url: target.url
        };

        return scheme.getResponse(request2);
    }
}

function createSchemeHandler(scheme: WebScheme): WKURLSchemeHandler {

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView: any, task: any) {
        let nsurl = task.request.URL;
        let url: string = nsurl.absoluteString.js;
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