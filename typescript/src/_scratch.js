(function () {

    let app = Application.currentApplication();
    app.includeStandardAdditions = true;

    ObjC.import('Foundation');
    ObjC.import('Cocoa');
    ObjC.import('AppKit');

    function DataReader(workQ, resultQ) {
        workQ = workQ || $.NSOperationQueue.alloc.init;
        resultQ = resultQ || $.NSOperationQueue.currentQueue || $.NSOperationQueue.mainQueue;

        function readData(path, offset, length, cb) {
            path = $(path);

            workQ.addOperationWithBlock(function () {
                try {
                    function readData(path, offset, length) {
                        function seek(handle, offset) {
                            if (handle.seekToOffsetError) {
                                let error = $();
                                return handle.seekToOffsetError(offset, error);
                            }
                
                            handle.seekToFileOffset(offset);
                            return (handle.offsetInFile == offset);
                        }
                
                        function read(handle, length) {
                            if (handle.readDataUpToLengthError) {
                                let error = $();
                                return handle.readDataUpToLengthError(length, error);
                            }
                
                            return handle.readDataOfLength(length);
                        }
                
                        let ns = $(path);
                        let handle = $.NSFileHandle.fileHandleForReadingAtPath(ns);
                        let error = $();
                        if (seek(handle, offset)) {
                            return read(handle, length);
                        }
                    }
                    let result = readData(path, offset, length);
                    resultQ.addOperationWithBlock(() => {
                        cb(result);
                    });
                } catch (e) {

                }
            });
        }

        return { readData };
    }

    let dr = DataReader();
    dr.readData("/Users/user/Desktop/__current/In the Dark.jpg", 0, 1024, (data)=>{ console.log(data.length); });

})();

throw 1;

(function () {

    let app = Application.currentApplication();
    app.includeStandardAdditions = true;

    ObjC.import('Foundation');
    ObjC.import('Cocoa');
    ObjC.import('AppKit');

    console.log($.NSThread.currentThread.isMainThread);

    let queue = $.NSOperationQueue.alloc.init;
    queue.maxConcurrentOperations = 4;

    function log(contents) {
        let path = `/Users/user/Desktop/__current/log.txt`;
        let s = $(contents);
        s.writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
    }

    function op(t, cb) {
        // $.NSBlockOperation.blockOperationWithBlock(function () {
        //     console.log("block");
        // });

        let text = $(t);
        queue.addOperationWithBlock(function () {
            try {
                console.log("block");
                log(`${$.NSThread.currentThread.isMainThread}`);
                console.log(text.js);
                console.log("block");
                let resultInt = 32;
                let result = $("result");
                $.NSOperationQueue.mainQueue.addOperationWithBlock(() => {
                    cb(result.js, resultInt);
                });
            } catch (e) {
                console.log("error");
            }
        });
    }

    op("Data", (result, value) => { console.log(value, result, `${$.NSThread.currentThread.isMainThread}`); });

})();

throw 1;

function readData(path, offset, length) {
    function seek(handle, offset) {
        if (handle.seekToOffsetError) {
            let error = $();
            return handle.seekToOffsetError(offset, error);
        }

        handle.seekToFileOffset(offset);
        return (handle.offsetInFile == offset);
    }

    function read(handle, length) {
        if (handle.readDataUpToLengthError) {
            let error = $();
            return handle.readDataUpToLengthError(length, error);
        }

        return handle.readDataOfLength(length);
    }

    let ns = $(path);
    let handle = $.NSFileHandle.fileHandleForReadingAtPath(ns);
    let error = $();
    if (seek(handle, offset)) {
        return read(handle, length);
    }
}

let url = "file-system://callionica.com/Users/user/Desktop/__current/marple/02-1.ts";
let path = "/Users/user/Desktop/__current/marple/02-1.ts";

let data = readData(path, 63, 64);

console.log(data.length);

throw 1;


var s;
debugger;

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
                            console.log("didReceiveData", data.length);
                        }
                    },
                    "didFinish": {
                        types: ["void", []],
                        implementation: function didFinish() {
                            console.log("didFinish");
                        }
                    },
                    "didFailWithError:": {
                        types: ["void", ["id"]],
                        implementation: function didFailWithError(error) {
                            console.log("didFailWithError", error.localizedDescription.js);
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
                                this.task.didFinish;
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

    function createSession(delegate = $()) {
        let configuration = $.NSURLSessionConfiguration.defaultSessionConfiguration;
        configuration.waitsForConnectivity = true
        return $.NSURLSession.sessionWithConfigurationDelegateDelegateQueue(configuration, delegate, $());
    }

    function createTaskSession(task) {
        let delegate = createTaskDelegate(task);
        let session = createSession(); //delegate);
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

        let dataRequest = $.NSMutableURLRequest.alloc.initWithURL(dataURL);
        dataRequest.setValueForHTTPHeaderField("bytes=0-1023", "Range"); // 1609656

        let session = createTaskSession(task);
        //let dataTask = session.dataTaskWithRequest(request);
        //let dataTask = session.dataTaskWithURL(dataURL);

        function handler(data, response, error) {
            console.log("HANDLER", data.length, (error.isNil() ? "No error" : error.localizedDescription.js));
        }

        let dataTask = session.dataTaskWithRequestCompletionHandler(dataRequest, handler);
        //let dataTask = session.dataTaskWithURLCompletionHandler(dataURL, handler);
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

    //let url = "file-system://callionica.com/Volumes/B128/TV/Blue%20Planet%20Revisited/Blue%20Planet%20Revisited%20-%20Series%201%20-%201.%20A%20Sharks%20Tale.ts";
    let url = "file-system://callionica.com/Users/user/Desktop/__current/marple/02-1.ts";
    let webView = $();
    let task = createMockWKTask();
    task.request = $.NSURLRequest.requestWithURL($.NSURL.URLWithString(url));

    /*{
        request: $.NSURLRequest.requestWithURL($.NSURL.URLWithString(url)),
        didReceiveResponse: (response) => { log(response) },
        didReceiveData: (data) => { log(data) },
        didFinish: () => { log("finished") },
        didFailWithError: (error) => { log(error) },
    };*/


    webViewStartURLSchemeTask(webView, task);
})();
