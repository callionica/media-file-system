// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES TOTAL ACCESS TO THE LOCAL FILE SYSTEM.

// An implementation of WKURLSchemeHandler that gives more flexibility than the file:// scheme
// when using WKWebView to read files from the local file system. For example, using a custom
// scheme allows us to provide a default document (index.html) when the URL represents a folder.
// It also allows us to load files from multiple disks without hitting the security blocks associated
// with the file:// scheme.
function WebSchemeHandler(config) {

    function alert(text, informationalText) {
        if (text && text.js) text = text.js;
        if (informationalText && informationalText.js) informationalText = informationalText.js;
        var options = {};
        if (informationalText) options.message = informationalText;
        let app = Application.currentApplication();
        app.includeStandardAdditions = true;
        app.displayAlert(text, options);
    }

    let logCount = 0;
    function log(contents) {
        let path = `/Users/user/Desktop/__current/log${++logCount}.txt`;
        let s = $(contents);
        s.writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
    }

    // Get the file path and extension from a URL
    // adding "/index.html" if the URL is a folder
    function pathAndExtension(url) {
        let path = url.path;
        let extension = url.pathExtension;

        const separator = "/";
        function isFolder(url) {
            return url.absoluteString.js.endsWith(separator);
        }

        if (isFolder(url)) {
            extension = $("html");
            path = $(path.js + separator + "index.html");
        }

        return { path, extension };
    }

    // Standard javascript:
    function mimeTypeForExtension(extension) {
        let ext = extension.toLowerCase();
        let types = {
            "htm": "text/html",
            "html": "text/html",

            "css": "text/css",

            "js": "application/javascript",

            "txt": "text/plain",

            "ttml": "application/ttml+xml",
            "vtt": "text/vtt",
            "webvtt": "text/vtt",
            "srt": "text/plain",

            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",

            "ts": "video/mp2t",
            "mp2": "video/mpeg",
            "mp2v": "video/mpeg",

            "mp4": "video/mp4",
            "mp4v": "video/mp4",
            "m4v": "video/x-m4v",

            "mp3": "audio/mpeg",
            "m4a": "audio/m4a",
            "m3u": "audio/x-mpegurl",
            "m3u8": "audio/x-mpegurl",
        };
        return types[ext] || "text/plain";
    }

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

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let url = task.request.URL;
        let { path, extension } = pathAndExtension(url);
        let mimeType = mimeTypeForExtension(extension.js);

        let error = $();
        let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(path, error);
        let fileSize = attrs.fileSize;

        let status = 200;
        let data;

        let headers = {
            "Content-Type": `${mimeType}; charset=utf-8`,
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
            "Content-Length": `${fileSize}`,
        };

        let range = task.request.valueForHTTPHeaderField("Range");
        if (!range.isNil()) {
            let handledRange = false;

            log(`${path.js} ${fileSize} ${range.js}`);

            // We are dealing with a range request
            let m = range.js.match(/^bytes=(?<first>\d+)-(?<last>\d+)?$/);

            // TODO - handle suffix range requests
            // TODO - handle conditional requests
            // TODO - other validation

            if (m) {
                let first = parseInt(m.groups.first, 10);
                let last = (m.groups.last === undefined) ? (fileSize - 1) : parseInt(m.groups.last, 10);

                if ((first <= last) && (last < fileSize)) {
                    let length = (last - first) + 1;

                    log(`${path.js} ${length} ${first} ${last}`);

                    if (length > 10 * 1000 * 1000) {
                        log(`Range too large`);
                        task.didFinish();
                        return;
                    }

                    status = 206;
                    headers["Content-Length"] = `${length}`;
                    headers["Content-Range"] = `bytes ${first}-${last}/${fileSize}`

                    // subdataWithRange will raise NSRangeException if not within range
                    // but we should never see that because we've already checked validity
                    // data = data.subdataWithRange($.NSMakeRange(first, length));

                    data = readData(path, first, length);

                    log(`${path.js} ${data.length}`);

                    handledRange = true;

                    $.NSBeep();
                }
            }

            if (!handledRange) {
                status = 416;
                headers["Content-Length"] = `0`;
                headers["Content-Range"] = `bytes */${data.length}`
                data = $.NSData.data;
            }

        } else {
            
            if (fileSize > 10 * 1000 * 1000) {
                $.NSBeep();
                task.didFinish();
                return;
            }

            let options = $.NSDataReadingMappedIfSafe;
            data = $.NSData.dataWithContentsOfFileOptionsError(path, options, error);
        }

        let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, status, $(), $(headers));

        log(`${httpResponse.URL.absoluteString.js} ${JSON.stringify(headers, null, 2)}`);

        task.didReceiveResponse(httpResponse);
        task.didReceiveData(data);
        task.didFinish();
    }

    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
        // Nothing to do here
    }

    let className = "CalliURLSchemeHandler";
    if (!$[className]) {
        ObjC.registerSubclass({
            name: className,
            // protocols: ['WKURLSchemeHandler'],
            methods: {
                'webView:startURLSchemeTask:': {
                    types: ["void", ["id", "id"]],
                    implementation: WKURLSchemeHandler_webViewStartURLSchemeTask,
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
