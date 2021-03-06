// ALL RIGHTS RESERVED

// Polyfills
// import 'ts-polyfill/lib/es2019-array';

if (!(Array.prototype as any).flatMap) {

    function flatMap(this: any, fn: any) {
        let nonFlat = this.map(fn);
        return nonFlat.reduce((p: any[], n: any[]) => {
            p.push(...n);
            return p;
        }, []);
    }

    (Array.prototype as any).flatMap = flatMap as any;
}

//////////////////////////////////////////////////////////////////////////////////////////////////

// some only returns a boolean
// find only returns exactly the object in the array
// grab returns the object returned by the function as soon as it is not undefined
function grab<T, U>(data: T[], fn: (value: T) => U): U | undefined {
    let result: U | undefined;
    data.some(item => {
        if (undefined !== (result = fn(item))) {
            return true;
        }
    });
    return result;
}

function sort_by<T>(keyFn: (value: T) => any) {
    return function sorter(a: T, b: T) {
        var keyA = keyFn(a);
        var keyB = keyFn(b);
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    }
}

function crunch(text: string): string {
    // Lowercase and diacritic removal
    let c1 = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Remove punctuation except dashes & periods & underscores
    c1 = c1.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\/:;<=>?@\[\]^`{|}~]/g, "");

    // Convert northern european letters
    c1 = c1.replace(/å/g, "aa");
    c1 = c1.replace(/ø|ö|œ/g, "oe");
    c1 = c1.replace(/æ/g, "ae");

    // Collapse to english 26 and digits
    c1 = c1.replace(/[^a-z0-9]/g, "-");

    // Coalesce dashes
    c1 = c1.replace(/-{2,}/g, "-");

    return c1;
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

    read(item: FSItem): string;
}

declare let ObjC: any;

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

    let extensions: string[] = [];
    const extensionsMaximumLength = 1000;

    function name(url: FSURL): FSName {

        // Extensions are shared by many files, so cache and reuse them to reduce memory
        function cache(extension: string): string {
            let found = extensions.find(ext => ext === extension);
            if (found) {
                return found;
            }

            if (extensions.length < extensionsMaximumLength) {
                extensions.push(extension);
            }

            return extension;
        }

        let last = url.endsWith(separator) ? url.length - 2 : url.length - 1;
        let slashIndex = url.lastIndexOf(separator, last);
        let name = decodeURIComponent(url.substring(slashIndex + 1, last + 1));

        let extension = undefined;
        let dotIndex = name.lastIndexOf(".");
        if (dotIndex >= 0) {
            return {
                name: name.substring(0, dotIndex),
                extension: cache(name.substring(dotIndex + 1))
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

    function read(item: FSItem): string {
        let fileURL = $.NSURL.URLWithString(item.targetURL || item.url); // NSURL
        let path = fileURL.path; // NSString
        let data = $.NSFileManager.defaultManager.contentsAtPath(path); // NSData
        let contents = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
        if (contents.isNil()) {
            contents = $.NSString.alloc.initWithDataEncoding(data, $.NSWindowsCP1252StringEncoding);
        }
        if (contents.isNil()) {
            contents = $.NSString.alloc.initWithDataEncoding(data, $.NSMacOSRomanStringEncoding);
        }
        return contents.js;
    };

    return { item, children, name, isFolder, isFolderItem, read };
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

let FSExpanded = (function () {

    function isFolderItem(item: FSExpandedItem): boolean {
        return (FS.isFolderItem(item) || ((item.targetURLs !== undefined) && item.targetURLs.some(FS.isFolder)));
    }

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
    function toFSExpandedItem(item: FSItem): FSExpandedItem {
        // Get the target
        let targetURL = item.targetURL || item.url;
        let target = FS.name(targetURL);

        if (target.extension === "junction") {
            // TODO - error handling!
            // The target is (probably) a junction so now we can get multiple targets
            let data = FS.read(item);
            let targetURLs = data.split("\n").map(url => {
                let item = FS.item(url); // Change this if we want junctions to refer to junctions
                return item.targetURL || item.url;
            });
            return { ...item, targetURLs };
        }

        // If the target is not a junction, return the existing item
        // FSItem and FSExpandedItem are compatible
        return item;
    }

    function item(path: FSURL | FSPath): FSExpandedItem {
        let item = FS.item(path);
        return toFSExpandedItem(item);
    }

    function children(item: FSExpandedItem): FSExpandedItem[] {
        let items = toFSItems(item);
        return items.flatMap(item => FS.children(item).map(item => toFSExpandedItem(item)));
    }

    return { isFolderItem, item, children };
})();

//////////////////////////////////////////////////////////////////////////////////////////////////

// FSExtended allows a single URL to link to multiple URLs (a single item becomes multiple items)
// FSNamed groups multiple URLs under a single name (multiple items become a single item)
// Both of these features are needed to allow parallel directory trees to be merged
// Given:
// /Disk1/folderX/folderY
// /Disk2/folderX/folderY
// We use a junction for folderX to merge the trees
// while FSNamed.children makes the multiple folderY's 
// that appear as children of the junction naturally look like a single child.

// A collection of items with the same name
interface FSNamedItem {
    name: FSName;
    items: FSExpandedItem[];
}

let FSNamed = (function () {

    function isFolderItem(item: FSNamedItem): boolean {
        return item.items.some(FSExpanded.isFolderItem);
    }

    function toFSNamedItem(item: FSExpandedItem) {
        return { name: FS.name(item.url), items: [item] };
    }

    function item(path: FSURL | FSPath): FSNamedItem {
        let item = FSExpanded.item(path);
        return toFSNamedItem(item);
    }

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
        return result; //.sort(sort_by((x: FSNamedItem) => x.name.name));
    }

    return { isFolderItem, item, children };
})();

//////////////////////////////////////////////////////////////////////////////////////////////////

const formatters = [
    { name: "Group - 01-01 Name", formatter: (x: any) => `${x.group} - ${x.subgroup}-${x.number} ${x.name}` },
];

interface Data {
    name?: string; // Track name, Episode name
    numberFromName?: string; // Track number, episode number if it came from the name

    group?: string; // Artist, Show
    subgroup?: string; // Album, Season
    subgroupNumber?: string; // Season number

    number?: string;  // Track number, episode number
    endNumber?: string;  // Last track number, episode number in a range

    year?: string;
    month?: string;
    day?: string;
}

function parseData(text: string, possibles: RegExp[]): Data {
    let match;
    for (var possible of possibles) {
        match = possible.exec(text);
        if (match) {
            break;
        }
    }

    return match ? { ...match.groups } : {};
}

let standardDataExtractors = (function () {

    // Because of greedy matching \s*(?<x>.*\S)\s* means that x starts and ends with non-whitespace

    // Whitespace
    let ws = `(?:\\s{1,4})`;

    // Create a regular expression
    function re(...patterns: string[]) {
        // Anchor to start/end and allow (ignore) leading/trailing whitespace
        return new RegExp(`^${ws}?` + patterns.join("") + `${ws}?$`, "i");
    }

    // Make some pieces of a regular expression optional
    function opt(...patterns: string[]) {
        if (patterns.length == 1) {
            return patterns[0] + "?";
        }
        return `(?:${patterns.join("")})?`;
    }

    // Group multiple items
    function grp(...patterns: string[]) {
        return `(?:${patterns.join("")})`;
    }

    // Group alternatives
    function alt(...patterns: string[]) {
        if (patterns.length == 1) {
            return patterns[0];
        }
        return `(?:${patterns.join("|")})`;
    }

    // Named capture group
    function cap(name: keyof Data) {
        return function (...patterns: string[]) {
            return `(?<${name}>${patterns.join("")})`;
        }
    }

    let period = `[.]`;
    let dash = `-`;
    let colon = `:`;

    let separator = grp(ws, dash, ws);

    let season = alt(`Series`, `Season`, `S`);
    let episode = alt(`Episode`, `Ep[.]?`, `E`);
    let track = alt(`Track`);

    let digits = (count: number) => `(?:\\d{${count}})`;
    let phrase = `(?:.{0,64}\\S)`;
    let number = (capture: keyof Data) => grp(`0{0,4}`, cap(capture)(`\\d{1,4}(?=\\D|$)`));

    let number_prefix = (capture: keyof Data) => grp(number(capture), alt(separator, grp(period, ws), ws));

    let year = cap("year")(digits(4));
    let month = cap("month")(digits(2));
    let day = cap("day")(digits(2));

    let dateSeparator = alt(dash, period, ws);

    let group = phrase;
    let subgroupNumber = number("subgroupNumber");
    let subgroup = alt(grp(season, ws, subgroupNumber), phrase);
    let name = alt(grp(alt(episode, track), ws, number("numberFromName")), phrase);

    return [
        re(
            cap("group")(group), separator,
            cap("subgroup")(subgroup), separator,
            number_prefix("number"),
            cap("name")(name)
        ),
        re( // Date TV format: "Doctor Who - 2005-03-26 - Rose"
            cap("group")(group), separator,
            year, dateSeparator, month, dateSeparator, day, alt(separator, ws),
            cap("name")(name)
        ),
        re( // Plex TV format: "Doctor Who - s1e1 - Rose"
            opt(cap("group")(group), separator),
            season, subgroupNumber, episode, number("number"),
                opt(opt(dash), episode, number("endNumber")), separator,
            cap("name")(name)
        ),
        re( // Preferred TV format: "Doctor Who - 01-01 Rose"
            opt(cap("group")(group), separator),
            subgroupNumber, dash, number("number"), opt(alt(separator, ws),
            cap("name")(name))
        ),
        re(
            cap("group")(group), separator,
            cap("subgroup")(subgroup), separator,
            cap("name")(name)
        ),
        re( // Audio format (artist & album come from folders): "01 Rose"
            number_prefix("number"),
            cap("name")(name)
        ),
        re(
            cap("group")(group), separator,
            number_prefix("number"),
            cap("name")(name)
        ),
        re(
            cap("group")(group), separator,
            cap("name")(name)
        ),
    ];
})();

type CategoryKind = "audio" | "video" | "text" | "image" | "subtitle" | "folder" | "unknown";

interface Category {
    extensions: string[];
    kind: CategoryKind;
    isLeader: boolean;
    extractors: RegExp[];
}

const categories: Category[] = [
    { extensions: ["junction"], kind: "folder", isLeader: true, extractors: standardDataExtractors },
    { extensions: ["m4a"], kind: "audio", isLeader: true, extractors: standardDataExtractors },
    { extensions: ["m4v", "mp4", "ts"], kind: "video", isLeader: true, extractors: standardDataExtractors },
    { extensions: ["txt"], kind: "text", isLeader: false, extractors: standardDataExtractors },
    { extensions: ["jpeg", "jpg", "png"], kind: "image", isLeader: false, extractors: standardDataExtractors },
    { extensions: ["vtt", "ttml", "srt"], kind: "subtitle", isLeader: false, extractors: standardDataExtractors },
];

const folderCategory: Category = categories[0];
const defaultCategory: Category = { extensions: [], kind: "unknown", isLeader: false, extractors: standardDataExtractors };

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

function isLeaderFollowerName(leader: FSName, follower: FSName): boolean {
    let l = leader.name + ".";
    let f = follower.name + ".";
    return f.startsWith(l);
}

function isLeaderFollowerNamedItem(leader: FSNamedItem, follower: FSNamedItem): boolean {
    return isLeaderFollowerName(leader.name, follower.name);
}

function isLeaderFollower(leader: MFSItem, follower: MFSItem): boolean {
    return leader.isLeader && !follower.isLeader && isLeaderFollowerNamedItem(leader.namedItem, follower.namedItem);
}

type MFSTag = string;
type MFSLanguage = string;

interface MFSName {
    core: string;
    tags: MFSTag[];
}

function splitName(text: string): MFSName {

    /*function sortKey(text: string): string {
		function padNumber(key: string): string {
			var pieces = key.split("-");
			pieces.forEach((piece, n) => {
				if (piece.match(/^\d{1,10}$/)) {
					pieces[n] = ("0000000000" + piece).substr(piece.length);
				}
			});
			
			return pieces.join("-");
        }
        let key = text.replace(/^((the)|(an?)|(l[aeo]s?)|(un[ae]?)|(un[ao]s)|(des))-(.*)$/i, "$8");

        return padNumber(key);
    }*/

    // A tag starts with a period, cannot contain spaces or periods,
    // and the first character after the period (if there is one) is not a digit
    // All valid tags appear at the end of the string
    // The prefix before all the tags is the core name (excluding leading/trailing space)
    let re = /^\s*(?<core>.*?)\s*(?<tags>(?<tag>[.](?=\D|$)[^\s.]*)*)$/;
    let m = re.exec(text);
    if (m) {
        let g = m.groups!;
        let core = g.core;
        // let crunched = crunch(core);
        // let sort = sortKey(crunched);
        return { core, tags: g.tags.split(".").filter(x => x !== "") };
    }

    // Don't ever expect to be here since the regex should always match
    let core = text;
    // let crunched = crunch(core);
    // let sort = sortKey(crunched);
    return { core, tags: [] };
}

class MFSItem {
    namedItem: FSNamedItem;
    category_: Category;
    // An item can be a folder and not-a-folder at the same time
    // For example, a junction is a text file that acts like a folder
    // and, because we group file system items by name, we could
    // have a true file and a true folder grouped together
    isFolder: boolean;
    parent?: MFSItem;
    children_?: MFSItem[];
    leaders_?: MFSItem[];
    followers_?: MFSItem[];
    data_?: Data;
    mfsName_?: MFSName;
    extraTags_?: MFSTag[];

    static item(path: FSURL | FSPath, parent?: MFSItem): MFSItem {
        return new MFSItem(FSNamed.item(path), parent);
    }

    constructor(namedItem: FSNamedItem, parent?: MFSItem) {
        this.namedItem = namedItem;
        this.isFolder = FSNamed.isFolderItem(namedItem);
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
        this.data_ = undefined;
        this.mfsName_ = undefined;
        this.extraTags_ = undefined;
    }

    // The children of the parent excluding this item
    get siblings(): MFSItem[] {
        if (this.parent === undefined) {
            return [];
        }
        return this.parent.children.filter(child => child !== this);
    }

    // The children of this item that are kind === "folder"
    get folders(): MFSItem[] {
        return this.children.filter(child => child.kind === "folder");
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

    get fileSystemName(): string {
        return this.namedItem.name.name;
    }

    get name(): string {
        if (this.mfsName_ === undefined) {
            this.mfsName_ = splitName(this.fileSystemName);
        }
        return this.mfsName_.core;
    }

    // get crunchedName(): string {
    //     if (this.mfsName_ === undefined) {
    //         this.mfsName_ = splitName(this.fileSystemName);
    //     }
    //     return this.mfsName_.crunched;
    // }

    // get sortKey(): string {
    //     if (this.mfsName_ === undefined) {
    //         this.mfsName_ = splitName(this.fileSystemName);
    //     }
    //     return this.mfsName_.sort;
    // }

    get tags(): MFSTag[] {
        if (this.mfsName_ === undefined) {
            this.mfsName_ = splitName(this.fileSystemName);
        }
        return this.mfsName_.tags;
    }

    get extension(): string | undefined {
        return this.namedItem.name.extension;
    }

    // If this item follows a leader, return the extra tags
    // TODO: There's a different definition of tags between tags and extraTags
    // tags - needs to distinguish between the core name and the tags so we don't
    // allow tags to contain spaces or start with a number
    // extra tags - we already know where the core name is so we don't check for spaces/numbers
    get extraTags(): MFSTag[] {
        let leader = this.leaders[0];
        if (leader === undefined) {
            return [];
        }
        let name = this.fileSystemName;
        let core = leader.fileSystemName;
        let remainder = name.substring(core.length);
        let tags = remainder.split(".").filter(x => x !== "");
        this.extraTags_ = tags;
        return this.extraTags_;
    }

    get children(): MFSItem[] {
        if (this.children_ === undefined) {
            let children = FSNamed.children(this.namedItem);
            this.children_ = children.map(child => new MFSItem(child, this));
            // TODO - add virtual leaders here, generated from parsing names
            // parse name, if !item.exists, create virtual
            // TODO - sorting
            // this.children_ = this.children_.sort(sort_by((x: MFSItem) => x.fileSystemName));
        }
        return this.children_;
    }

    get data(): Data {
        if (this.data_ === undefined) {
            this.data_ = parseData(this.name, this.category_.extractors);
        }
        return this.data_;
    }

    get media(): Data {
        let result = { ...this.data };

        function cleanup(text: string) {
            text = text.replace(/[_\s]+/g, " ");
            return text;
        }

        if (result.group === undefined) {
            if (this.parent) {
                if (this.parent.parent) {
                    result.group = this.parent.parent.name;
                } else {
                    result.group = this.parent.name;
                }
            }
        }

        if (result.group !== undefined) {
            result.group = cleanup(result.group);
        }

        if (result.subgroup === undefined) {
            if (result.subgroupNumber !== undefined) {
                result.subgroup = `Season ${result.subgroupNumber}`;
            } else if (result.year !== undefined) {
                result.subgroup = result.year;
            } else if (this.parent && this.parent.parent) {
                result.subgroup = this.parent.name;
            }
        }

        if (result.subgroup !== undefined) {
            result.subgroup = cleanup(result.subgroup);
        }

        if (result.number === undefined) {
            if (result.numberFromName !== undefined) {
                result.number = result.numberFromName;
            }
        }

        if (result.name === undefined) {
            result.name = this.name;
        }

        if (result.name !== undefined) {
            result.name = cleanup(result.name);
        }

        return result;
    }

    get language(): MFSLanguage {

        function tag2language(tag: string): MFSLanguage | undefined {
            let languageTag = tag.toLowerCase();
            let data = [
                ["en", "en-us", "en-gb", "english"],
                ["da", "da-dk", "dansk", "dansk1", "dansk2", "kommentar", "non-dansk", "danish"],
                ["de", "de-de", "deutsch", "german"],
                ["no", "norsk", "norwegian"],
                ["sv", "sv-se", "se", "svenska", "swedish"],
                ["fr", "français", "francais", "french"],
                ["es", "espagnol", "spanish"],
            ];

            let language = grab(data, languageTags => {
                if (languageTags.indexOf(languageTag) >= 0) {
                    return languageTags[0];
                }
            });

            return language;
        }

        function tags2language(tags: MFSTag[]): MFSLanguage {
            let language = grab(tags, tag2language);
            return language || "en";
        }

        return tags2language(this.tags);
    }

    toJSON() {
        // TODO
        return {
            name: this.name,
            media: this.media,
            kind: this.kind,
            extension: this.extension,
            tags: this.tags.length ? this.tags : undefined,
            language: this.language,
            fileSystemName: this.fileSystemName,
            followers: this.followers.length ? this.followers : undefined,

        };
        //return { ...this.group, kind: this.kind, children: this.children_ };
    }
}
