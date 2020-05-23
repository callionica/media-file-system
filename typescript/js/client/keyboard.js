"use strict";
class KeyboardCommand {
    constructor(name, shortcut, action) {
        this.name = name;
        this.shortcut = shortcut;
        this.enabled = true;
        this.action = action;
    }
}
// Takes a member function and makes it into a command handler
function command(o, key) {
    return (shortcut) => {
        console.log(shortcut, key);
        o[key]();
        return true;
    };
}
function toShortcut(event) {
    function adjustKey(key) {
        const replacements = {
            " ": "Space",
            "Backspace": "Delete",
            "Enter": "Enter",
            "Meta": "", "Control": ":", "Alt": "", "Shift": "",
            "ArrowUp": "↑",
            "ArrowDown": "↓",
            "ArrowLeft": "←",
            "ArrowRight": "→",
        };
        let replacement = replacements[key];
        if (replacement) {
            return replacement;
        }
        return key.toUpperCase();
    }
    let command = event.metaKey ? "⌘" : "";
    let control = event.ctrlKey ? "^" : "";
    let alt = event.altKey ? "⌥" : "";
    let shift = event.shiftKey ? "⇧" : "";
    let key = adjustKey(event.key);
    return `${command}${control}${alt}${shift}${key}`;
}
class KeyboardController {
    constructor() {
        this.enableLogging = false;
        this.commands = [];
        this.commandsVisible = false;
        this.commandsVisibleTimeout = undefined;
        this.commands.push(new KeyboardCommand("Keyboard: Logging on/off", "L", command(this, "toggleLogging")));
    }
    toggleLogging() {
        this.enableLogging = !this.enableLogging;
    }
    showCommands() {
        // console.log("Commands:", JSON.stringify(this.commands, null, 2));
        console.log("Commands:", this.commands);
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
        if (this.enableLogging) {
            console.log("onkeydown", event, shortcut);
        }
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
        if (this.enableLogging) {
            console.log("onkeyup", event, shortcut);
        }
        this.hideCommands_();
    }
}
//# sourceMappingURL=keyboard.js.map