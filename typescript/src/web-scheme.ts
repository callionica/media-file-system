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

interface NSURLComponents {
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
    statusCode: number;
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

declare const console: any;

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
    status: number,
    headers: WebSchemeHeaders,
    data: NSData,
};

interface WebScheme {
    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse>;
}

// Route requests by using the scheme or the first path component
class WebSchemeRouter implements WebScheme {
    schemes: { [key: string]: WebScheme };

    constructor(schemes: { [key: string]: WebScheme }) {
        this.schemes = schemes;
    }

    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse> {
        let nsurl = $.NSURL.URLWithString(request.url);
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

        return scheme.getResponse(request);
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