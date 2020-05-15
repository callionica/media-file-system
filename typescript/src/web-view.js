// ALL RIGHTS RESERVED

// WATCH OUT!!! DO NOT USE THIS WEB VIEW IF YOU INTEND TO LOAD UNTRUSTED HTML PAGES!

// This WKWebView has a WKScriptMessageHandler that calls into the feature functions
// specified by the creator of the web view.
// This allows the web pages contained by the WKWebView to execute code in the 
// context of the JXA host app. This is only sensible if you have complete control over
// the web pages that you load in the web view.

function quotedString(o) {
    let result = JSON.stringify(o, null, 2);

    // If o was already a string, the JSON version will be a quoted string
    if (result[0] === '"') {
        return result;
    }

    // Otherwise we need to stringify again to get a quoted string
    return JSON.stringify(result);
}

function ensureInteger(value) {
    if (Number.isInteger(value)) {
        return value;
    }

    throw new Error("Not an integer");
}

function WebView(url, schemes, features = { $log: (...args) => console.log("Host:", ...args) }) {
    let webview;

    function evalInGuest(js) {
        webview.evaluateJavaScriptCompletionHandler(js, (result, error) => { });
    }

    function enableEvalInHost(config) {
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

                            // Call the feature and convert the result to a promise
                            // because the feature could return a promise or a non-promise,
                            // so we need to treat promises and non-promises the same.
                            let promise;
                            try {
                                let feature = features[o.request.name];
                                let result = feature(...o.request.args);
                                promise = Promise.resolve(result);
                            } catch (e) {
                                promise = Promise.reject(e);
                            }

                            // Package up the results and send them back
                            let responseID = ensureInteger(o.response);
                            promise.then(result => {
                                let r = result && quotedString(result);
                                let js = `evalInHostResponse(${responseID}, ${r}, undefined);`; // UNSAFE
                                evalInGuest(js);
                            }).catch(error => {
                                let e = error && quotedString(error);
                                let js = `evalInHostResponse(${responseID}, undefined, ${e});`; // UNSAFE
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

        let featureProxies = Object.keys(features).map(key => `
function ${key}(...args) {
    return evalInHost(${JSON.stringify(key)}, args);
}
`);

        let userScript =
            `
let evalInHostResponses = [];

function evalInHost(name, args) {
    let promise = new Promise((resolve, reject) => {
        let cb = (result, error) => {
            if (error !== undefined) {
                reject(error);
            } else {
                resolve(result);
            }
        };
        evalInHostResponses.push(cb);
        let response = (evalInHostResponses.length - 1);

        let json = JSON.stringify({ request: { name, args }, response }, null, 2);
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

${featureProxies.join("\n")}
`
            ;

        let script = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(userScript, $.WKUserScriptInjectionTimeAtDocumentStart, true);
        controller.addUserScript(script);
    }

    let rect = $.NSZeroRect
    let config = $.WKWebViewConfiguration.alloc.init
    enableEvalInHost(config);

    if (schemes !== undefined) {
        for (let scheme of schemes) {
            config.setURLSchemeHandlerForURLScheme(scheme.handler, scheme.name);
        }
    }

    // config.preferences.setValueForKey(ObjC.wrap(true), ObjC.wrap("allowFileAccessFromFileURLs"));
	// config.preferences.setValueForKey(ObjC.wrap(true), ObjC.wrap("universalAccessFromFileURLsAllowed"));

    webview = $.WKWebView.alloc.initWithFrameConfiguration(rect, config)
    let u = $.NSURL.URLWithString(url)
    let request = $.NSURLRequest.requestWithURL(u)
    webview.loadRequest(request)
    return webview;
}
