// ALL RIGHTS RESERVED

// An implementation of WKURLSchemeHandler that gives more flexibility than the file:// scheme
// when using WKWebView to read files from the local file system.

function WebSchemeHandler(config) {
    let className = "CalliSchemeHandler";
    if (!$[className]) {
        ObjC.registerSubclass({
            name: className,
            // protocols: ['WKURLSchemeHandler'],
            methods: {
                'webView:startURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: function (webView, task){
                        let url = task.request.url.copy;
                        url.scheme = "file";

                        let 
                    }
                },
                'webView:stopURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: function(webView, task){

                    }
                }
            }
        });
    }
    let handler = $[className].alloc.init;
    return handler;
}
