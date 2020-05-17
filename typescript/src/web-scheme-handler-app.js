// // ALL RIGHTS RESERVED

// // Combines file-system:// and web:// scheme handlers
// function WebSchemeHandlerApp(cache = $.NSURLCache.sharedURLCache) {
    
//     let file = createSchemeHandler(new WebSchemeFile());
//     let web = createSchemeHandler(new WebSchemeWeb(cache));

//     function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
//         let url = task.request.URL;

//         let prefix = "/web:";
//         if (url.path.hasPrefix(prefix)) {
//             web.webViewStartURLSchemeTask(webView, task);
//         } else {
//             file.webViewStartURLSchemeTask(webView, task);
//         }
//     }

//     function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
//         // Nothing to do here
//     }

//     let className = "CalliURLSchemeHandlerApp";
//     if (!$[className]) {
//         ObjC.registerSubclass({
//             name: className,
//             // protocols: ['WKURLSchemeHandler'],
//             methods: {
//                 'webView:startURLSchemeTask:': {
//                     types: ["void", ["id", "id"]],
//                     implementation: WKURLSchemeHandler_webViewStartURLSchemeTask,
//                 },
//                 'webView:stopURLSchemeTask:': {
//                     types: ["void", ["id", "id"]],
//                     implementation: WKURLSchemeHandler_webViewStopURLSchemeTask,
//                 }
//             }
//         });
//     }

//     let handler = $[className].alloc.init;
//     return handler;
// }
