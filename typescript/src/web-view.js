// ALL RIGHTS RESERVED.

// WATCH OUT!!!
// THIS CODE ALLOWS AN HTML PAGE TO EXECUTE CODE AS IF IT IS A JXA SCRIPT!
// DO NOT USE IT IF YOU INTEND TO LOAD UNTRUSTED HTML PAGES!

// This WKWebView has a WKScriptMessageHandler that evals the message passed to it.
// This allows the web pages contained by the WKWebView to execute Javascript in the 
// context of the JXA host app. This is only sensible if you have complete control over
// the web pages that you load in the web view.

// Web pages hosted by this webview can call evalInHost(js) which returns a Promise
function WebView(url, schemeHandler) {
    const scheme = "media-file";

    let webview;

    function evalInGuest(js) {
        webview.evaluateJavaScriptCompletionHandler(js, (result, error) => { });
    }

    function EnableEvalInHost(config) {
        let handlerName = "eval";

        let className = "CalliScriptMessageHandler";
        if (!$[className]) {
            ObjC.registerSubclass({
                name: className,
                // protocols: ['WKScriptMessageHandler'],
                methods: {
                    'userContentController:didReceiveScriptMessage:': {
                        types: ["void", ["id", "id"]],
                        implementation: (controller, message) => {
                            // Parse the request
                            let o = JSON.parse(message.body.js);

                            // Eval the code and convert the result to a promise
                            // (because if the code returns a promise, we'll need it to get the result)
                            let promise;
                            try {
                                // eval is UNSAFE
                                // The code that we are going to execute came from the web page
                                let result = eval(o.request); // UNSAFE
                                promise = Promise.resolve(result);
                            } catch (e) {
                                promise = Promise.reject(e);
                            }

                            // Package up the results and send them back
                            promise.then(result => {
                                let r = result && ("`" + JSON.stringify(result, null, 2) + "`");
                                let js = `evalInHostResponse(${o.response}, ${r}, undefined);`; // UNSAFE
                                evalInGuest(js);
                            }).catch(error => {
                                let e = error && ("`" + error + "`");
                                let js = `evalInHostResponse(${o.response}, undefined, ${e});`; // UNSAFE
                                evalInGuest(js);
                            });
                        }
                    }
                }
            });
        }
        let handler = $[className].alloc.init;

        let controller = config.userContentController;

        controller.addScriptMessageHandlerName(handler, handlerName);

        let us =
            `
let evalInHostResponses = [];

function evalInHost(js) {
    let promise = new Promise((resolve, reject) => {
        let cb = (result, error) => {
            if (error !== undefined) {
                reject(error);
            } else {
                resolve(result);
            }
        };
        evalInHostResponses.push(cb);
        let responseID = (evalInHostResponses.length - 1);

        let json = JSON.stringify({ request: js, response: responseID}, null, 2);
        window.webkit.messageHandlers.${handlerName}.postMessage(json);
    });
    
    return promise;
}

function evalInHostResponse(responseID, jsonResult, error) {
    let cb = evalInHostResponses[responseID];
    evalInHostResponses[responseID] = undefined;
    if (cb) {
        let result = jsonResult && JSON.parse(jsonResult);
        cb(result, error);
    }
}
`
            ;

        let script = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(us, $.WKUserScriptInjectionTimeAtDocumentStart, true);
        controller.addUserScript(script);
    }

    let rect = $.NSZeroRect
    let config = $.WKWebViewConfiguration.alloc.init
    EnableEvalInHost(config);

    if (schemeHandler !== undefined) {
        config.setURLSchemeHandlerForURLScheme(schemeHandler, scheme);
    }

    // config.preferences.setValueForKey(ObjC.wrap(true), ObjC.wrap("allowFileAccessFromFileURLs"));
	// config.preferences.setValueForKey(ObjC.wrap(true), ObjC.wrap("universalAccessFromFileURLsAllowed"));

    webview = $.WKWebView.alloc.initWithFrameConfiguration(rect, config)
    let u = $.NSURL.URLWithString(url)
    let request = $.NSURLRequest.requestWithURL(u)
    webview.loadRequest(request)
    return webview;
}
