(function () {

    let app = Application.currentApplication();
    app.includeStandardAdditions = true;

    ObjC.import('Foundation');
    ObjC.import('Cocoa');
    ObjC.import('AppKit');

    function createMockWKTask() {
        let className = "CalliMockWKTask";
        if (!$[className]) {
            ObjC.registerSubclass({
                name: className,
                properties: {
                    request: "id",
                },
                methods: {
                    "didReceiveResponse:": {
                        types: ["void", ["id"]],
                        implementation: function didReceiveResponse(response) {
                            console.log("didReceiveResponse");
                        }
                    },
                    "didReceiveData:": {
                        types: ["void", ["id"]],
                        implementation: function didReceiveData(data) {
                            console.log("didReceiveData");
                        }
                    },
                    "URLSession:task:didCompleteWithError:": {
                        types: ["void", ["id", "id", "id"]],
                        implementation: function (session, dataTask, error) {
                            if (error.isNil()) {
                                this.task.didFinish();
                            } else {
                                this.task.didFailWithError(error);
                            }
                        }
                    },
                }
            });
        }
        let result = $[className].alloc.init;
        return result;
    }

    function createTaskDelegate(task) {
        let className = "CalliURLSessionDelegate";
        if (!$[className]) {
            ObjC.registerSubclass({
                name: className,
                // protocols: ['NSURLSessionTaskDelegate', 'NSURLSessionDataDelegate'],
                properties: {
                    task: "id",
                },
                methods: {
                    "URLSession:dataTask:didReceiveResponse:completionHandler:": {
                        types: ["void", ["id", "id", "id", "id"]],
                        implementation: function (session, dataTask, response, completionHandler) {
                            this.task.didReceiveResponse(response);
                            completionHandler($.NSURLSessionResponseAllow);
                        }
                    },
                    "URLSession:dataTask:didReceiveData:": {
                        types: ["void", ["id", "id", "id"]],
                        implementation: function (session, dataTask, data) {
                            this.task.didReceiveData(data);
                        }
                    },
                    "URLSession:task:didCompleteWithError:": {
                        types: ["void", ["id", "id", "id"]],
                        implementation: function (session, dataTask, error) {
                            if (error.isNil()) {
                                this.task.didFinish();
                            } else {
                                this.task.didFailWithError(error);
                            }
                        }
                    },
                }
            });
        }
        let result = $[className].alloc.init;
        result.task = task;
        return result;
    }

    function createSession(delegate) {
        let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
        configuration.waitsForConnectivity = true
        return $.NSURLSession.sessionWithConfigurationDelegateDelegateQueue(configuration, delegate, $());
    }

    let s;

    function createTaskSession(task) {
        let delegate = createTaskDelegate(task);
        let session = createSession(delegate);
        s = session; // TODO
        return session;
    }

    function webViewStartURLSchemeTask(webView, task) {

        let error = $();
        let url = task.request.URL;
        console.log(task.request);
        console.log(url);
        let path = url.path;
        let extension = url.pathExtension;
        console.log(path.js);
        console.log(extension.js);

        let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(path, error);
        console.log(attrs.fileSize, attrs.fileType.js);
        console.log(JSON.stringify(ObjC.unwrap(attrs), null, 2));

        let dataURL = $.NSURL.fileURLWithPath(path);
        let session = createTaskSession(task);
        //let dataTask = session.dataTaskWithRequest(request);
        let dataTask = session.dataTaskWithURL(url);
        dataTask.resume;
        return;

        let mimeType = "text/html"; // TODO
        let options = $.NSDataReadingMappedIfSafe;

        let data = $.NSData.dataWithContentsOfFileOptionsError(path, options, error);
        let expectedContentLength = data.length;
        console.log(expectedContentLength);
        let response = $.NSURLResponse.alloc.initWithURLMIMETypeExpectedContentLengthTextEncodingName(url, mimeType, expectedContentLength, $());

        let headers = {
            "Content-Type": mimeType,
            "Cache-Control": "no-cache",
        };

        let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, 200, $(), $(headers));

        task.didReceiveResponse(httpResponse);
        task.didReceiveData(data);
        task.didFinish();
    }

    function log(x) {
        console.log(x);
    }

    //let url = "media-file://callionica.com/Volumes/B128/TV/Blue%20Planet%20Revisited/Blue%20Planet%20Revisited%20-%20Series%201%20-%201.%20A%20Sharks%20Tale.ts";
    let url = "media-file://callionica.com/Users/user/Desktop/__current/marple/02-1.ts";
    let webView = $();
    let task = {
        request: $.NSURLRequest.requestWithURL($.NSURL.URLWithString(url)),
        didReceiveResponse: (response) => { log(response) },
        didReceiveData: (data) => { log(data) },
        didFinish: () => { log("finished") },
        didFailWithError: (error) => { log(error) },
    };


    webViewStartURLSchemeTask(webView, task);
})();
