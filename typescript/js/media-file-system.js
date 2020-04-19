"use strict";
// ALL RIGHTS RESERVED
let FS = (function () {
    const separator = "/";
    function isFolder(url) {
        return url.endsWith(separator);
    }
    function isFolderItem(item) {
        return (isFolder(item.url) || ((item.targetURL !== undefined) && isFolder(item.targetURL)));
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
    return { item, items, name, isFolder, isFolderItem };
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
const categories = [
    { extensions: ["m4a"], kind: "audio", isLeader: true },
    { extensions: ["m4v", "mp4", "ts"], kind: "video", isLeader: true },
    { extensions: ["text"], kind: "text", isLeader: false },
    { extensions: ["jpeg", "jpg", "png"], kind: "image", isLeader: false },
    { extensions: ["vtt", "ttml"], kind: "subtitle", isLeader: false },
];
const folderCategory = { extensions: [], kind: "folder", isLeader: true };
const defaultCategory = { extensions: [], kind: "unknown", isLeader: false };
function category(name) {
    if (name.extension !== undefined) {
        let ext = name.extension.toLowerCase();
        let category = categories.find(category => category.extensions.includes(ext));
        if (category !== undefined) {
            return category;
        }
    }
    return defaultCategory;
}
function isLeaderFollower_(leader, follower) {
    let l = leader.name + ".";
    let f = follower.name + ".";
    return f.startsWith(l);
}
function isLeaderFollower(leader, follower) {
    return leader.isLeader && !follower.isLeader && isLeaderFollower_(leader.name, follower.name);
}
class MFSItem {
    constructor(group, parent) {
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
        this.tags_ = undefined;
    }
    // The children of the parent excluding this item
    get siblings() {
        if (this.parent === undefined) {
            return [];
        }
        return this.parent.children.filter(child => child !== this);
    }
    get kind() {
        return this.category_.kind;
    }
    get isLeader() {
        return this.category_.isLeader;
    }
    // If I'm a follower, my leaders are either siblings or my parent
    // Only followers have leaders
    get leaders() {
        if (this.leaders_ !== undefined) {
            return this.leaders_;
        }
        if (this.isLeader) {
            this.leaders_ = [];
        }
        else {
            let result = [];
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
    get followers() {
        if (this.followers_ !== undefined) {
            return this.followers_;
        }
        if (!this.isLeader) {
            this.followers_ = [];
        }
        else {
            let result = [];
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
    get tags() {
        /*
        A follower's tags are the period-separated parts of its name that follow the leader's name.
        Otherwise, an item's tags are the period-separated pieces of text at the end of the name,
        that do not contain spaces or start with digits.
        */
        function parseTags(text) {
            let tags = text.split(".");
            let i = tags.length - 1;
            let found = false;
            for (; i >= 1; --i) {
                // It's not a tag if it starts with a digit or contains a space or is empty
                if (tags[i].match(/(?<digit>^\d)|(?<space>\s)|(?<empty>^$)/)) {
                    break;
                }
                else {
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
    get name() {
        return this.group.name;
    }
    get children() {
        if (this.children_ === undefined) {
            let groups = mergedItems(this.group.items);
            this.children_ = groups.map(group => new MFSItem(group, this));
            // TODO - add virtual leaders here, generated from parsing names
            // parse name, if !item.exists, create virtual 
        }
        return this.children_;
    }
    toJSON() {
        return Object.assign(Object.assign({}, this.group), { children: this.children_ });
    }
}
//# sourceMappingURL=media-file-system.js.map