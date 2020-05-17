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
class WebSchemeFile implements WebScheme {

    getResponse(request: WebSchemeRequest): Promise<WebSchemeResponse> {
        return createMainQueuePromise<WebSchemeResponse>((resolve, reject) => {
            // Get the file path and extension from a URL
            // adding "/index.html" if the URL is a folder
            function pathAndExtension(url: NSURL) {
                let path = url.path.js;
                let extension = url.pathExtension.js;

                const separator = "/";
                function isFolder(url: NSURL) {
                    return url.absoluteString.js.endsWith(separator);
                }

                if (isFolder(url)) {
                    extension = "html";
                    path = path + separator + "index.html";
                }

                return { path, extension };
            }

            function getRange(fileSize: number, range?: string) {
                const MB = 1024 * 1024;
                const minimumRangeLength = 1 * MB;
                const maximumRangeLength = 8 * MB;
                const maximumFileSize = 16 * MB;

                let first = 0;
                let length = Math.min(fileSize, maximumFileSize);
                let last = length - 1;
                let status = (length == fileSize) ? 200 : 206;

                if (range !== undefined) {
                    // We are dealing with a range request
                    let m: { groups?: any } | null = range.match(/^bytes=(?<first>\d+)-(?<last>\d+)?$/);

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

            let url = $.NSURL.URLWithString(request.url);
            let { path, extension } = pathAndExtension(url);
            let mimeType = mimeTypeForExtension(extension);

            let error = $();
            let attrs = $.NSFileManager.defaultManager.attributesOfItemAtPathError(path, error);
            let fileSize = attrs.fileSize;

            let data;

            let headers: WebSchemeHeaders = {
                "Content-Type": `${mimeType}; charset=utf-8`,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "Accept-Ranges": "bytes",
                "Content-Length": `${fileSize}`,
            };

            let range = getRange(fileSize, request.headers["Range"]);

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

            resolve({ status, headers, data });
        });
    }
}
