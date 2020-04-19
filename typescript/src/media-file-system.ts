// ALL RIGHTS RESERVED

// FSPath is a unix-style file system path
type FSPath = string;

// FSURL is a file:// URL
type FSURL = string;

// FSItem is a file, folder, or link in the file system
interface FSItem {
    url: FSURL,
    targetURL?: FSURL
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
    items(container: FSItem): FSItem[];

    // Get the name and optional extension from a file system URL
    name(url: FSURL): FSName;

    // Does a file system URL represent a folder
    isFolder(url: FSURL): boolean;

    // Does a file system item represent a folder
    isFolderItem(item: FSItem): boolean;
}

declare let ObjC: any;
declare let $: any;

let FS: FS = (function () {
    const separator = "/";

    function isFolder(url: FSURL): boolean {
        return url.endsWith(separator);
    }

    function isFolderItem(item: FSItem): boolean {
        return (isFolder(item.url) || ((item.targetURL !== undefined) && isFolder(item.targetURL)));
    }

    function isFSURL(path: FSURL | FSPath): path is FSURL {
        return path.startsWith("file:");
    }

    function name(url: FSURL): FSName {

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

    interface NSString {
        readonly js: string;
    }

    interface NSURL {
        getResourceValueForKeyError(value: any, key: any, error: any): any;
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

    function toFSURL(path: FSPath): FSURL {
        return $.NSURL.fileURLWithPath(path).absoluteString.js;
    }

    function item(path: FSPath | FSURL): FSItem {
        let url: FSURL = isFSURL(path) ? path : toFSURL(path);
        let nsurl = $.NSURL.URLWithString(url);
        let targetURL: FSURL = nsurl.URLByResolvingSymlinksInPath.absoluteString.js;
        return (url === targetURL) ? { url } : { url, targetURL };
    }

    function items(container: FSItem): FSItem[] {
        let directoryURL = $.NSURL.URLWithString(container.targetURL || container.url);
        let keys = $();
        let e = $.NSFileManager.defaultManager.enumeratorAtURLIncludingPropertiesForKeysOptionsErrorHandler(directoryURL, keys, NSDirectoryEnumerationSkipsSubdirectoryDescendants | NSDirectoryEnumerationSkipsHiddenFiles, null);

        let o: [NSURL] = e.allObjects.js;
        return o.map(url => item(url.absoluteString.js));
    }

    return { item, items, name, isFolder, isFolderItem };
})();

// A collection of FSItems with the same name
interface FSGroup {
    name: FSName;
    items: FSItem[];
}

// Get all the items contained in a set of folders and group them by name.
// Imagine parallel folder layouts where we want /Disk1/folderA/folderB/
// and /Disk2/folderA/folderB/ to contribute files to the same tree.
function mergedItems(containers: FSItem[]): FSGroup[] {
    let result: FSGroup[] = [];
    for (let container of containers) {
        let items = FS.items(container);
        for (let item of items) {
            let name = FS.name(item.url);
            let existing = result.find(e => (e.name.name === name.name) && (e.name.extension === name.extension));
            if (existing === undefined) {
                existing = { name, items: [item] };
                result.push(existing);
            } else {
                existing.items.push(item);
            }
        }
    }
    return result;
}

//////////////////////////////////////////////////////////////////////////////////////////////////

type CategoryKind = "audio" | "video" | "text" | "image" | "subtitle" | "folder" | "unknown";

interface Category {
    extensions: string[];
    kind: CategoryKind;
    isLeader: boolean;
}

const categories: Category[] = [
    { extensions: ["m4a"], kind: "audio", isLeader: true },
    { extensions: ["m4v", "mp4", "ts"], kind: "video", isLeader: true },
    { extensions: ["text"], kind: "text", isLeader: false },
    { extensions: ["jpeg", "jpg", "png"], kind: "image", isLeader: false },
    { extensions: ["vtt", "ttml"], kind: "subtitle", isLeader: false },
];

const folderCategory: Category = { extensions: [], kind: "folder", isLeader: true };
const defaultCategory: Category = { extensions: [], kind: "unknown", isLeader: false };

function category(name: FSName): Category {
    if (name.extension !== undefined) {
        let ext = name.extension.toLowerCase();
        let category = categories.find(category => category.extensions.includes(ext));
        if (category !== undefined) {
            return category;
        }
    }
    return defaultCategory;
}

function isLeaderFollower(leader: FSName, follower: FSName): boolean {
    let l = leader.name + ".";
    let f = follower.name + ".";
    return f.startsWith(l);
}

class MFSItem {
    group: FSGroup;
    category_: Category;
    // An item can be a folder and not-a-folder at the same time
    isFolder: boolean;
    parent?: MFSItem;
    children_?: MFSItem[];
    leaders_?: MFSItem[];
    followers_?: MFSItem[];

    constructor(group: FSGroup, parent?: MFSItem) {
        this.group = group;
        this.isFolder = group.items.some(FS.isFolderItem);
        this.category_ = this.isFolder ? folderCategory : category(group.name);

        if (parent !== undefined) {
            this.parent = parent;
            // Note that parent.children is not usable during construction
        }
    }

    refresh() {
        this.children_ = undefined;
        this.leaders_ = undefined;
        this.followers_ = undefined;
    }

    get siblings(): MFSItem[] {
        if (this.parent === undefined) {
            return [];
        }
        return this.parent.children;
    }

    get kind(): string {
        return this.category_.kind;
    }

    get isLeader(): boolean {
        return this.category_.isLeader;
    }

    // If I'm a follower, my leaders are either siblings or my parent
    // Only followers have leaders
    get leaders(): MFSItem[] {
        if (this.leaders_ !== undefined) {
            return this.leaders_;
        }

        if (this.isLeader) {
            this.leaders_ = [];
        } else {
            let result: MFSItem[] = [];
            if (this.parent !== undefined) {
                if (isLeaderFollower(this.parent.name, this.name)) {
                    result.push(this.parent);
                }
                for (let sibling of this.siblings) {
                    if (isLeaderFollower(sibling.name, this.name)) {
                        result.push(sibling);
                    }
                }
            }
            this.leaders_ = result;
        }
        return this.leaders_;
    }

    // If I'm a leader, my followers are either siblings or children
    // Only leaders have followers
    get followers(): MFSItem[] {
        if (this.followers_ !== undefined) {
            return this.followers_;
        }

        if (!this.isLeader) {
            this.followers_ = [];
        } else {
            let result: MFSItem[] = [];

            for (let sibling of this.siblings) {
                if (isLeaderFollower(this.name, sibling.name)) {
                    result.push(sibling);
                }
            }

            for (let child of this.children) {
                if (isLeaderFollower(this.name, child.name)) {
                    result.push(child);
                }
            }

            this.followers_ = result;
        }
        return this.followers_;
    }

    get name(): FSName {
        return this.group.name;
    }

    get children(): MFSItem[] {
        if (this.children_ === undefined) {
            let groups = mergedItems(this.group.items);
            this.children_ = groups.map(group => new MFSItem(group, this));
            // TODO - add virtual leaders here, generated from parsing names
            // parse name, if !item.exists, create virtual 
        }
        return this.children_;
    }

    toJSON() {
        return { ...this.group, children: this.children_ };
    }
}
