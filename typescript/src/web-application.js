// ALL RIGHTS RESERVED.

// WATCH OUT!!!
// THIS CODE ALLOWS AN HTML PAGE TO EXECUTE CODE AS IF IT IS A JXA SCRIPT!
// DO NOT USE IT IF YOU INTEND TO LOAD UNTRUSTED HTML PAGES!

// This WKWebView has a WKScriptMessageHandler that evals the message passed to it.
// This allows the web pages contained by the WKWebView to execute Javascript in the 
// context of the JXA host app. This is only sensible if you have complete control over
// the web pages that you load in the web view.

// Web pages can call evalInHost(js, cb) where:
// js - The javascript code to execute in the host's context
// cb - A callback function of the form (result, error) => {} to receive the result or error
// of executing the code
function WebView(url) {

    let webview;

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

                            let result;
                            let error;
                            try {
                                // eval is UNSAFE
                                // The code that we are going to execute came from the web page
                                result = eval(o.request); // UNSAFE
                            } catch (e) {
                                // Lack of escaping is unsafe
                                // We're going to use this error text to build up Javascript that we execute in the page context
                                error = "`" + e + "`"; // UNSAFE
                            }

                            // Package up the results and send them back
                            let r = result && ("`" + JSON.stringify(result, null, 2) + "`");
                            let js = `evalInHostResponse(${o.response}, ${r}, ${error});`; // UNSAFE
                            webview.evaluateJavaScriptCompletionHandler(js, (result, error) => { });
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

function evalInHost(js, cb) {
    evalInHostResponses.push(cb);
    let responseID = (evalInHostResponses.length - 1);

    let json = JSON.stringify({ request: js, response: responseID}, null, 2);
    window.webkit.messageHandlers.${handlerName}.postMessage(json);
}

function evalInHostResponse(responseID, result, error) {
    let cb = evalInHostResponses[responseID];
    evalInHostResponses[responseID] = undefined;
    if (cb) {
        let o = result && JSON.parse(result);
        cb(o, error);
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
    webview = $.WKWebView.alloc.initWithFrameConfiguration(rect, config)
    let u = $.NSURL.URLWithString(url)
    let request = $.NSURLRequest.requestWithURL(u)
    webview.loadRequest(request)
    return webview;
}
