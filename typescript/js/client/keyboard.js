"use strict";
class KeyboardCommand {
    constructor(name, shortcut, action) {
        this.name = name;
        this.shortcut = shortcut;
        this.enabled = true;
        this.action = action;
    }
}
function toShortcut(event) {
    let command = event.metaKey ? "⌘" : "";
    let control = event.ctrlKey ? "^" : "";
    let alt = event.altKey ? "⌥" : "";
    let shift = event.shiftKey ? "⇧" : "";
    let key = ["Meta", "Control", "Alt", "Shift"].includes(event.key) ? "" : event.key;
    return `${command}${control}${alt}${shift}${key}`;
}
class KeyboardController {
    constructor() {
        this.commands = [];
        this.commandsVisible = false;
        this.commandsVisibleTimeout = undefined;
    }
    showCommands() {
        console.log("Commands:", JSON.stringify(this.commands, null, 2));
    }
    hideCommands() {
        console.log("Commands: hide");
    }
    hideCommands_() {
        clearTimeout(this.commandsVisibleTimeout);
        this.commandsVisibleTimeout = undefined;
        if (this.commandsVisible) {
            this.commandsVisible = false;
            this.hideCommands();
            return true;
        }
        return false;
    }
    showCommands_() {
        if (!this.commandsVisible && this.commandsVisibleTimeout == undefined) {
            this.commandsVisibleTimeout = setTimeout(() => {
                this.commandsVisibleTimeout = undefined;
                this.commandsVisible = true;
                this.showCommands();
            }, 2 * 1000);
        }
    }
    onkeydown(event) {
        let shortcut = toShortcut(event);
        console.log(shortcut, event);
        let handled = this.hideCommands_();
        if (!handled) {
            if (shortcut == "⌘") {
                this.showCommands_();
                return;
            }
            let commands = this.commands.filter(command => command.enabled && (command.shortcut === shortcut));
            handled = false;
            for (let command of commands) {
                handled = command.action(shortcut);
                if (handled) {
                    break;
                }
            }
        }
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    onkeyup(event) {
        let shortcut = toShortcut(event);
        console.log(shortcut, event);
        this.hideCommands_();
    }
}
const keyboardController = (function () {
    let kc = new KeyboardController();
    document.onkeydown = (e) => kc.onkeydown(e);
    document.onkeyup = (e) => kc.onkeyup(e);
    return kc;
})();
//# sourceMappingURL=keyboard.js.map