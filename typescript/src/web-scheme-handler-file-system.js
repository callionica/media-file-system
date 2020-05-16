// ALL RIGHTS RESERVED

// DO NOT USE THIS SCHEME HANDLER IF YOU EVER LOAD UNTRUSTED CONTENT IN THE WEBVIEW.
// THIS SCHEME HANDLER GIVES TOTAL ACCESS TO THE LOCAL FILE SYSTEM.

// IT DOES NOT MATTER IF THE PAGE IS FROM ANOTHER ORIGIN, WE INCLUDE THE
// Access-Control-Allow-Origin: *
// RESPONSE HEADER TO ALLOW CROSS-ORIGIN REQUESTS TO SUCCEED

// An implementation of WKURLSchemeHandler that gives more flexibility than the file:// scheme
// when using WKWebView to read files from the local file system. For example, using a custom
// scheme allows us to provide a default document (index.html) when the URL represents a folder.
// It also allows us to load files from multiple disks without hitting the security blocks associated
// with the file:// scheme.

// This implementation handles Range requests (partially).
// Currently all requests can return a partial response (code 216)
// even if the request doesn't contain a Range header.
// If a file is larger than 16 MB and there is no Range header, we'll return the first 16 MB only
// If the request contains a Range larger than 8 MB, we'll return the first 8 MB only
// If the request contains a Range smaller than 1 MB, we'll return a full 1 MB from the start of the range
// Otherwise, we return the whole of the file or the whole of the requested range

// Typically this handler will be registered and used as "file-system://"
function WebSchemeHandlerFileSystem() {
    let workQ = $.NSOperationQueue.alloc.init;

    let logCount = 0;
    function log(contents) {
        let path = `/Users/user/Desktop/__current/log${++logCount}.txt`;
        let s = $(contents);
        s.writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
    }

    // Get the file path and extension from a URL
    // adding "/index.html" if the URL is a folder
    // and removing /file: from the path if it's present
    // (which allows us to combine file-system and web scheme handlers)
    function pathAndExtension(url) {
        let path = removePrefix(url.path.js, "/file:");
        let extension = url.pathExtension;

        const separator = "/";
        function isFolder(url) {
            return url.absoluteString.js.endsWith(separator);
        }

        if (isFolder(url)) {
            extension = $("html");
            path = $(path + separator + "index.html");
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

        let handle = $.NSFileHandle.fileHandleForReadingAtPath($(path));
        if (seek(handle, offset)) {
            return read(handle, length);
        }
    }

    function getRange(request, fileSize) {
        const MB = 1024 * 1024;
        const minimumRangeLength = 1 * MB;
        const maximumRangeLength = 8 * MB;
        const maximumFileSize = 16 * MB;

        let first = 0;
        let length = Math.min(fileSize, maximumFileSize);
        let last = length - 1;
        let status = (length == fileSize) ? 200 : 206;

        let range = request.valueForHTTPHeaderField("Range");
        if (!range.isNil()) {
            // We are dealing with a range request
            let m = range.js.match(/^bytes=(?<first>\d+)-(?<last>\d+)?$/);

            // TODO - handle suffix range requests
            // TODO - handle conditional requests
            // TODO - other validation

            if (m) {
                status = 206;
                first = parseInt(m.groups.first, 10);
                last = (m.groups.last === undefined) ? (fileSize - 1) : parseInt(m.groups.last, 10);
                length = (last - first) + 1;

                // Trim large requests to an acceptable size
                // and increase the size of small requests
                if (length < minimumRangeLength) {
                    length = minimumRangeLength;
                } else if (maximumRangeLength < length) {
                    length = maximumRangeLength;
                }

                last = (length - 1) + first;

                // If the last byte is beyond the size of the file,
                // bring it back in to range
                if (fileSize <= last) {
                    last = fileSize - 1;
                }
            }
        }

        return { status, first, last, length, fileSize };
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task) {
        let url = task.request.URL;
        let { path, extension } = pathAndExtension(url);
        let mimeType = mimeTypeForExtension(extension.js);

        let error = $();
        let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(path, error);
        let fileSize = attrs.fileSize;

        let data;

        let headers = {
            "Content-Type": `${mimeType}; charset=utf-8`,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
            "Content-Length": `${fileSize}`,
        };

        let range = getRange(task.request, fileSize);

        let { status, first, last, length /*, fileSize */ } = range;
        if ((first <= last) && (last < fileSize)) {

            headers["Content-Length"] = `${length}`;
            headers["Content-Range"] = `bytes ${first}-${last}/${fileSize}`

            data = readData(path, first, length);
        } else {
            status = 416;
            headers["Content-Length"] = `0`;
            headers["Content-Range"] = `bytes */${fileSize}`
            data = $.NSData.data;
        }

        let httpResponse = $.NSHTTPURLResponse.alloc.initWithURLStatusCodeHTTPVersionHeaderFields(url, status, $(), $(headers));

        // log(`${httpResponse.URL.absoluteString.js} ${JSON.stringify(headers, null, 2)}`);

        task.didReceiveResponse(httpResponse);
        task.didReceiveData(data);
        task.didFinish;
    }

    function WKURLSchemeHandler_webViewStartURLSchemeTaskQ(webView, task) {
        workQ.addOperationWithBlock(function () {
            try {
                WKURLSchemeHandler_webViewStartURLSchemeTask(webView, task);
            } catch (e) {
                // task.didFailWithError($.NSError.errorWithDomainCodeUserInfo($.kCFErrorDomainCFNetwork, $.kCFURLErrorUnknown, $()));
                console.log(e);
            }
        });
    }

    function WKURLSchemeHandler_webViewStopURLSchemeTask(webView, task) {
        // Nothing to do here
    }

    let className = "CalliURLSchemeHandlerFileSystem";
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
