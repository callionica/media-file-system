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
            return {
                name: name.substring(0, dotIndex),
                extension: name.substring(dotIndex + 1)
            };
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
    function items(container) {
        let directoryURL = $.NSURL.URLWithString(container.targetURL || container.url);
        let keys = $();
        let e = $.NSFileManager.defaultManager.enumeratorAtURLIncludingPropertiesForKeysOptionsErrorHandler(directoryURL, keys, NSDirectoryEnumerationSkipsSubdirectoryDescendants | NSDirectoryEnumerationSkipsHiddenFiles, null);
        let o = e.allObjects.js;
        return o.map(url => item(url.absoluteString.js));
    }
    return { item, items, name, isFolder };
})();
// Get all the items contained in a set of folders and group them by name.
// Imagine parallel folder layouts where we want /Disk1/folderA/folderB/
// and /Disk2/folderA/folderB/ to contribute files to the same tree.
function mergedItems(containers) {
    let result = [];
    for (let container of containers) {
        let items = FS.items(container);
        for (let item of items) {
            let name = FS.name(item.url);
            let existing = result.find(e => (e.name.name === name.name) && (e.name.extension === name.extension));
            if (existing === undefined) {
                existing = { name, items: [item] };
                result.push(existing);
            }
            else {
                existing.items.push(item);
            }
        }
    }
    return result;
}
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