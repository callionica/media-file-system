// ALL RIGHTS RESERVED

// Polyfills
// import 'ts-polyfill/lib/es2019-array';

if (!Array.prototype.flatMap) {

    function flatMap(this: any, fn: any) {
        let nonFlat = this.map(fn);
        return nonFlat.reduce((p: any[], n: any[]) => {
            p.push(...n);
            return p;
        }, []);
    }

    Array.prototype.flatMap = flatMap as any;
}

//////////////////////////////////////////////////////////////////////////////////////////////////

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
    children(container: FSItem): FSItem[];

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

    function children(container: FSItem): FSItem[] {
        let directoryURL = $.NSURL.URLWithString(container.targetURL || container.url);
        let keys = $();
        let e = $.NSFileManager.defaultManager.enumeratorAtURLIncludingPropertiesForKeysOptionsErrorHandler(directoryURL, keys, NSDirectoryEnumerationSkipsSubdirectoryDescendants | NSDirectoryEnumerationSkipsHiddenFiles, null);

        let o: [NSURL] = e.allObjects.js;
        return o.map(url => item(url.absoluteString.js));
    }

    return { item, children, name, isFolder, isFolderItem };
})();

//////////////////////////////////////////////////////////////////////////////////////////////////

// The standard file system allows links from one URL to another
// The expanded file system allows links from one URL to multiple others
// We make FSExpandedItem compatible with FSItem to avoid creating new objects
// so we have both targetURL? and targetURLs? properties
interface FSExpandedItem {
    url: FSURL;
    targetURL?: FSURL;
    targetURLs?: FSURL[];
}

let FSExpanded = (function(){
    
    // Convert an expanded item into a collection of standard items
    function toFSItems(item: FSExpandedItem): FSItem[] {
        if (item.targetURLs !== undefined) {
            return item.targetURLs.map(targetURL => {
                return { url: item.url, targetURL };
            });
        }

        return [item];
    }

    // Convert a standard item into an expanded item (by reading junction files if necessary)
    function toFSExpandedItem(item: FSItem) : FSExpandedItem {
        // Get the target
        let targetURL = item.targetURL || item.url;
        let target = FS.name(targetURL);
    
        if (target.extension === "junction") {
            // The target is (probably) a junction so now we can get multiple targets
            // TODO
            return item;
        }
    
        // If the target is not a junction, return the existing item
        // FSItem and FSExpandedItem are compatible
        return item;
    }

    function children(item: FSExpandedItem): FSExpandedItem[] {
        let items = toFSItems(item);
        return items.flatMap(item => FS.children(item).map(item => toFSExpandedItem(item)));
    }

    return { children };
})();

//////////////////////////////////////////////////////////////////////////////////////////////////

// A collection of items with the same name
interface FSNamedItem {
    name: FSName;
    items: FSExpandedItem[];
}

let FSNamed = (function(){
    // Get all the items contained in a set of folders and group them by name.
    // Imagine parallel folder layouts where we want /Disk1/folderA/folderB/
    // and /Disk2/folderA/folderB/ to contribute files to the same tree.
    function children(container: FSNamedItem): FSNamedItem[] {

        let result: FSNamedItem[] = [];
        for (let item of container.items) {
            let children = FSExpanded.children(item);
            for (let child of children) {
                let name = FS.name(child.url);
                let existing = result.find(e => (e.name.name === name.name) && (e.name.extension === name.extension));
                if (existing === undefined) {
                    existing = { name, items: [] };
                    result.push(existing);
                }
                existing.items.push(child);
            }
        }
        return result;
    }

    return { children };
})();

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
    { extensions: ["txt"], kind: "text", isLeader: false },
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

function isLeaderFollower_(leader: FSName, follower: FSName): boolean {
    let l = leader.name + ".";
    let f = follower.name + ".";
    return f.startsWith(l);
}

function isLeaderFollower(leader: MFSItem, follower: MFSItem): boolean {
    return leader.isLeader && !follower.isLeader && isLeaderFollower_(leader.name, follower.name);
}

class MFSItem {
    namedItem: FSNamedItem;
    category_: Category;
    // An item can be a folder and not-a-folder at the same time
    isFolder: boolean;
    parent?: MFSItem;
    children_?: MFSItem[];
    leaders_?: MFSItem[];
    followers_?: MFSItem[];
    tags_?: string[];

    constructor(namedItem: FSNamedItem, parent?: MFSItem) {
        this.namedItem = namedItem;
        this.isFolder = namedItem.items.some(FS.isFolderItem);
        this.category_ = this.isFolder ? folderCategory : category(namedItem.name);

        if (parent !== undefined) {
            this.parent = parent;
            // Note that parent.children is not usable during construction
        }
    }

    refresh() {
        this.children_ = undefined;
        this.leaders_ = undefined;
        this.followers_ = undefined;
        this.tags_ = undefined;
    }

    // The children of the parent excluding this item
    get siblings(): MFSItem[] {
        if (this.parent === undefined) {
            return [];
        }
        return this.parent.children.filter(child => child !== this);
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
                if (isLeaderFollower(this.parent, this)) {
                    result.push(this.parent);
                }
                for (let sibling of this.siblings) {
                    if (isLeaderFollower(sibling, this)) {
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
                if (isLeaderFollower(this, sibling)) {
                    result.push(sibling);
                }
            }

            for (let child of this.children) {
                if (isLeaderFollower(this, child)) {
                    result.push(child);
                }
            }

            this.followers_ = result;
        }
        return this.followers_;
    }

    get tags(): string[] {

        /*
        A follower's tags are the period-separated parts of its name that follow the leader's name.
        Otherwise, an item's tags are the period-separated pieces of text at the end of the name,
        that do not contain spaces, do not start with digits, and are not empty.
        */
        function parseTags(text: string) {
            let tags = text.split(".");

            let i = tags.length - 1;
            let found = false;
            for (; i >= 1; --i) {
                // It's not a tag if it starts with a digit or contains a space or is empty
                if (tags[i].match(/(?<digit>^\d)|(?<space>\s)|(?<empty>^$)/)) {
                    break;
                } else {
                    found = true;
                }
            }

            return found ? tags.slice(i + 1) : [];
        }

        let leader = this.leaders[0];
        if (leader === undefined) {
            return parseTags(this.name.name);
        }
        let name = this.name.name;
        let core = leader.name.name;
        let remainder = name.substring(core.length);
        let tags = remainder.split(".").filter(x => x !== "");
        this.tags_ = tags;
        return this.tags_;
    }

    get name(): FSName {
        return this.namedItem.name;
    }

    get children(): MFSItem[] {
        if (this.children_ === undefined) {
            let groups = FSNamed.children(this.namedItem);
            this.children_ = groups.map(group => new MFSItem(group, this));
            // TODO - add virtual leaders here, generated from parsing names
            // parse name, if !item.exists, create virtual 
        }
        return this.children_;
    }

    toJSON() {
        return {
            name: this.name.name,
            kind: this.kind,
            extension: this.name.extension,
            followers: this.followers.length ? this.followers : undefined,
            tags: this.tags.length ? this.tags : undefined,
        };
        //return { ...this.group, kind: this.kind, children: this.children_ };
    }
}
