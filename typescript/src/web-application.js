// ALL RIGHTS RESERVED

function createMenu() {
    function MenuItem(title, action, key, modifiers = $.NSCommandKeyMask) {
        let result = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent(title, action, key);
        result.setKeyEquivalentModifierMask(modifiers);
        return result;
    }

    function insertMenuAtIndex(menu, menuToInsert, index) {
        const menuItem = $.NSMenuItem.alloc.init;
        menuItem.submenu = menuToInsert;
        menu.insertItemAtIndex(menuItem, index);
    }

    let mainMenu = $.NSApplication.sharedApplication.mainMenu;

    const menuView = $.NSMenu.alloc.initWithTitle('View');

    menuView.addItem(MenuItem(
        "Enter Full Screen", "toggleFullScreen:",
        "f", $.NSCommandKeyMask | $.NSControlKeyMask
    ));

    // 0 - App; 1 - File; 2 - View
    insertMenuAtIndex(mainMenu, menuView, 2);
}

function Window(rect) {
    let windowMask = $.NSTitledWindowMask;
    windowMask |= $.NSClosableWindowMask;
    windowMask |= $.NSMiniaturizableWindowMask;
    let backing = $.NSBackingStoreBuffered;
    let defer = false;
    let window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(rect, windowMask, backing, defer);
    window.releasedWhenClosed = false;
    window.center;
    return window;
}

function WindowDelegate() {
    if (!$.WindowDelegate) {
        ObjC.registerSubclass({
            name: 'WindowDelegate',
            protocols: ['NSWindowDelegate'],
            methods: {
                'windowWillClose:'(notification) {
                    return $.NSApplication.sharedApplication.terminate(null)
                },
            },
        });
    }
    return $.WindowDelegate.alloc.init;
}

function WebViewWindow(url) {
    let [width, height] = [1024, 768];
    let scheme = { name: "media-file", handler: WebSchemeHandler() };
    let webView = WebView(url, scheme);
    webView.frame = $.NSMakeRect(0, 0, width, height);
    webView.autoresizingMask = $.NSViewWidthSizable | $.NSViewHeightSizable;
    let rect = $.NSMakeRect(0, 0, width, height);
    let window = Window(rect);
    window.styleMask |= $.NSResizableWindowMask;
    window.delegate = WindowDelegate();
    window.contentView.addSubview(webView);
    return window
}

function main() {
    ObjC.import('Foundation');
    ObjC.import('Cocoa');
    ObjC.import('WebKit');

    var app = Application.currentApplication();
    app.includeStandardAdditions = true;

    function toFSURL(path) {
        return $.NSURL.fileURLWithPath(path).absoluteString.js;
    }

    var path = toFSURL($.NSString.alloc.initWithUTF8String(app.pathTo(this)).stringByDeletingLastPathComponent.js + "/");

    createMenu();
    
    var MyWindow = WebViewWindow("media-file://callionica.com" + path + "$app.html")
    MyWindow.makeKeyAndOrderFront(null)
    MyWindow.toggleFullScreen(null);
}

main();
