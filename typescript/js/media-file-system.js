"use strict";
// ALL RIGHTS RESERVED
let FS = (function () {
    const separator = "/";
    function isFolder(url) {
        return url.endsWith(separator);
    }
    function isFSURL(path) {
        return path.startsWith("file:");
    }
    function name(url) {
        let last = url.endsWith(separator) ? url.length - 2 : url.length - 1;
        let slashIndex = url.lastIndexOf(separator, last);
        let name = decodeURIComponent(url.substring(slashIndex + 1, last + 1));
        let extension = undefined;
        let dotIndex = name.lastIndexOf(".");
        if (dotIndex >= 0) {
            name = name.substring(0, dotIndex);
            extension = name.substring(dotIndex + 1);
        }
        if (extension !== undefined) {
            return { name, extension };
        }
        return { name };
    }
    ObjC.import('Foundation');
    ObjC.import('AppKit');
    const NSDirectoryEnumerationSkipsSubdirectoryDescendants = 1 << 0;
    const NSDirectoryEnumerationSkipsPackageDescendants = 1 << 1;
    const NSDirectoryEnumerationSkipsHiddenFiles = 1 << 2;
    function toFSURL(path) {
        return $.NSURL.fileURLWithPath(path).absoluteString.js;
    }
    function item(path) {
        let url = isFSURL(path) ? path : toFSURL(path);
        let nsurl = $.NSURL.URLWithString(url);
        let targetURL = nsurl.URLByResolvingSymlinksInPath.absoluteString.js;
        return (url === targetURL) ? { url } : { url, targetURL };
    }
    function items(item) {
        function isDirectory(url) {
            var value = $();
            url.getResourceValueForKeyError(value, $.NSURLIsDirectoryKey, null);
            return value.boolValue;
        }
        function getType(url) {
            var value = $();
            url.getResourceValueForKeyError(value, $.NSURLTypeIdentifierKey, null);
            return value.js;
        }
        function mimetypeFromType(type) {
            if (type == "public.mpeg-2-transport-stream") {
                return "video/mp2t";
            }
            return ObjC.unwrap($.UTTypeCopyPreferredTagWithClass(type, $.kUTTagClassMIMEType));
        }
        function nameWithoutExtension(name) {
            var index = name.lastIndexOf(".");
            if (index >= 0) {
                return name.substring(0, index);
            }
            return name;
        }
        var directoryURL = $.NSURL.URLWithString(item.targetURL || item.url);
        var keys = $.NSArray.arrayWithObjects($.NSURLIsDirectoryKey, $.NSURLTypeIdentifierKey);
        var e = $.NSFileManager.defaultManager.enumeratorAtURLIncludingPropertiesForKeysOptionsErrorHandler(directoryURL, keys, NSDirectoryEnumerationSkipsSubdirectoryDescendants | NSDirectoryEnumerationSkipsHiddenFiles, null);
        var o = e.allObjects.js;
        return o.map(function (url) {
            var path = url.pathComponents.js.map(c => c.js);
            var type = getType(url);
            var linkTo;
            if (type == "public.symlink") {
                linkTo = url.URLByResolvingSymlinksInPath;
                type = getType(linkTo);
            }
            let mimetype = mimetypeFromType(type);
            let extension = url.pathExtension.js;
            if (!mimetype) {
                if (extension === "ttml") {
                    mimetype = "application/ttml+xml";
                }
            }
            return {
                name: nameWithoutExtension(url.lastPathComponent.js),
                extension,
                type,
                mimetype,
                url: url.absoluteString.js,
                targetURL: linkTo ? linkTo.absoluteString.js : undefined,
            };
        });
    }
    return { item, items, name, isFolder };
})();
function isEntry(value) {
    return value.kind !== undefined;
}
function dotExt(ext) {
    return (ext.length > 0) ? "." + ext : ext;
}
function nameExt(path) {
    return ["test", "ext"]; // TODO
}
function rename({ from, to }) {
    // TODO
}
class FolderEntry {
    constructor(parent, name, extension) {
        this.kind = "folder";
        if (isEntry(parent)) {
            this._parent = parent;
            this._path = "";
        }
        else {
            this._path = parent;
        }
        this._name = name;
        this._extension = extension;
        this._entries = undefined;
    }
    get parent() {
        return this._parent;
    }
    get fullName() {
        return `${this.name}${dotExt(this.extension)}`;
    }
    get parentPath() {
        if (this.parent) {
            return this.parent.path;
        }
        return this._path;
    }
    get path() {
        return `${this.parentPath}${this.fullName}/`;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        rename({ from: this.path, to: `${this.parentPath}${value}${dotExt(this.extension)}/` });
        this._name = value;
    }
    get extension() {
        return this._extension;
    }
    set extension(value) {
        rename({ from: this.path, to: `${this.parentPath}${this.name}${dotExt(value)}/` });
        this._extension = value;
    }
    get entries() {
        if (this._entries === undefined) {
            this._entries = [];
        }
        return this._entries;
    }
}
// /*
// An entity is either a leader or a follower
// Leaders may be follower-less and followers may be leader-less.
// */
// type EntityKind = "leader" | "follower";
// interface Entity {
//     kind: EntityKind;
//     entry: Entry;
// }
// interface Leader extends Entity {
//     kind: "leader";
//     followers: Follower[];
// }
// interface Follower extends Entity {
//     kind: "follower";
//     leader: Leader;
// }
// type F = string;
// interface Media {
//     kind: "audio" | "video";
//     file: F;
//     name: string;
//     date: string;
//     subgroup: string;
//     group: string;
// }
// class Folder {
//     parentFiles: string[];
//     files: string[];
//     getMedia() : Media[] {
//         return [];
//     }
//     constructor(files: string[], parentFiles: string[] = []) {
//         this.files = files;
//         this.parentFiles = parentFiles;
//     }
// }
//# sourceMappingURL=media-file-system.js.map