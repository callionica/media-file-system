// ALL RIGHTS RESERVED

// FSPath is a unix-style file system path
type FSPath = string;

// FSURL is a file:// URL
type FSURL = string;

// FSItem is a file, folder, or link in the file system
interface FSItem {
    url : FSURL,
    targetURL? : FSURL
}

// FSName is the name/extension pair
interface FSName {
    name: string;
    extension?: string;
}

// FS is a minimal file system API
interface FS {
    // Convert a path or URL into a file system item
    // Does not fail for non-existent items
    // Does check the file system to determine if item is a folder
    // Does check the file system to return the target for a link
    item(path: FSPath | FSURL): FSItem;

    // Get the items contained in a folder or linked folder
    // Does not fail for non-existent items
    // Does not fail for non-folders
    items(item: FSItem): FSItem[];

    // Get the name and optional extension from a file system URL
    name(url: FSURL) : FSName;

    // Does a file system URL represent a folder
    isFolder(url: FSURL) : boolean;
}

declare let ObjC : any;
declare let $ : any;

let FS: FS = (function () {
    const separator = "/";

    function isFolder(url: FSURL) : boolean {
        return url.endsWith(separator);
    }

    function isFSURL(path: FSURL | FSPath) : path is FSURL {
        return path.startsWith("file:");
    }

    function name(url: FSURL) : FSName {
        
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

    interface NSString {
        readonly js: string;
    }

    interface NSURL {
        getResourceValueForKeyError(value: any, key: any, error: any) : any;
        readonly pathExtension: NSString;
        readonly absoluteString: NSString;
        readonly lastPathComponent: NSString;
        readonly pathComponents: { js: NSString[] };
        readonly URLByResolvingSymlinksInPath: NSURL;
    }

    ObjC.import('Foundation');
    ObjC.import('AppKit');

    const NSDirectoryEnumerationSkipsSubdirectoryDescendants = 1 << 0;
    const NSDirectoryEnumerationSkipsPackageDescendants = 1 << 1;
    const NSDirectoryEnumerationSkipsHiddenFiles = 1 << 2;

    function toFSURL(path: FSPath) : FSURL {
        return $.NSURL.fileURLWithPath(path).absoluteString.js;
    }

    function item(path: FSPath | FSURL) : FSItem {
        let url : FSURL = isFSURL(path) ? path : toFSURL(path);
        let nsurl = $.NSURL.URLWithString(url);
        let targetURL : FSURL = nsurl.URLByResolvingSymlinksInPath.absoluteString.js;
        return (url === targetURL) ? { url } : { url, targetURL };
    }

    function items(item: FSItem) : FSItem[] {

        function isDirectory(url: NSURL) : boolean {
            var value = $();
            url.getResourceValueForKeyError(value, $.NSURLIsDirectoryKey, null)
            return value.boolValue;
        }

        function getType(url: NSURL) : string {
            var value = $();
            url.getResourceValueForKeyError(value, $.NSURLTypeIdentifierKey, null)
            return value.js;
        }

        function mimetypeFromType(type: string) : string {
            if (type == "public.mpeg-2-transport-stream") {
                return "video/mp2t";
            }
            return ObjC.unwrap($.UTTypeCopyPreferredTagWithClass(type, $.kUTTagClassMIMEType));
        }

        function nameWithoutExtension(name: string): string {
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

        return o.map(function (url: NSURL) {
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

/*
Conceptually, an entry lives in a file system tree
It may really exist there as a file or folder or 
it may be a virtual entry that is imagined into existence
*/


type EntryKind = "file" | "folder" | "virtual";

interface Entry {
    readonly kind: EntryKind;
    readonly parent: Entry | undefined;
    readonly path: FSPath;
    readonly fullName: string;

    name: string;
    extension: string;
    
    entries: Entry[];
}

function isEntry(value: any): value is Entry {
    return value.kind !== undefined;
}

function dotExt(ext: string) {
    return (ext.length > 0) ? "." + ext : ext;
}

function nameExt(path: FSPath): [string, string] {
    return ["test", "ext"]; // TODO
}

function rename({from, to}: {from: FSPath, to: FSPath}) {
    // TODO
}

class FolderEntry implements Entry {
    kind: "folder";
    _parent: Entry | undefined;
    _path: FSPath;
    _name: string;
    _extension: string;
    
    _entries: Entry[] | undefined;

    constructor(parent: Entry | FSPath, name: string, extension: string) {
        this.kind = "folder";
        if (isEntry(parent)) { 
            this._parent = parent;
            this._path = "";
        } else {
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

    get entries() : Entry[] {
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