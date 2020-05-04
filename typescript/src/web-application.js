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

    // 0 - App; 1 - File; 2 - Edit, 3 - View
    insertMenuAtIndex(mainMenu, menuView, 3);
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
    let scheme = { name: "file-system", handler: WebSchemeHandler() };
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

// Call main() with the path to the first page of your application
// Use relative paths within the pages and everything will work out great
function main(mainPage, host) {
    ObjC.import('Foundation');
    ObjC.import('Cocoa');
    ObjC.import('WebKit');

    let app = Application.currentApplication();
    app.includeStandardAdditions = true;

    let path = $.NSString.alloc.initWithUTF8String(app.pathTo(this)).stringByDeletingLastPathComponent.js + "/";

    if (host === undefined) {
        host = "callionica.com";
    }

    if (mainPage === undefined) {
        mainPage = path + "$app.html";
    }

    if (!mainPage.startsWith("/")) {
        throw "File paths must start with '/'";
    }

    createMenu();

    var MyWindow = WebViewWindow(`file-system://${host}${mainPage}`);
    MyWindow.makeKeyAndOrderFront(null);
    MyWindow.toggleFullScreen(null);
}

main();
