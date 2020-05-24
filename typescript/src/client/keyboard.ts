class KeyboardCommand {
    name: string;
    shortcut: string;
    enabled: boolean;
    action: (shortcut: string) => boolean;

    constructor(name: string, shortcut: string, action: (shortcut: string) => boolean) {
        this.name = name;
        this.shortcut = shortcut;
        this.enabled = true;
        this.action = action;
    }
}

class Control {
    keyboardDisabled: boolean = false;
}

// Takes a member function and makes it into a command handler
function command<K extends PropertyKey, T extends Record<K, () => void> & { keyboardDisabled?: boolean }>(o: T, key: K) {
    return (shortcut: string) => {
        console.log(shortcut, key);
        if (!o.keyboardDisabled) {
            o[key]();
            return true;
        }
        return false;
    };
}

function toShortcut(event: KeyboardEvent) {

    function adjustKey(key: string) {
        const replacements: { [key: string]: string } = {
            " ": "Space",
            "Backspace": "Delete",
            "Enter": "Enter",
            "Meta": "",
            "Control": "",
            "Alt": "",
            "Shift": "",
            "ArrowUp": "↑",
            "ArrowDown": "↓",
            "ArrowLeft": "←",
            "ArrowRight": "→",
        };

        let replacement = replacements[key];

        if (replacement !== undefined) {
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
    enableLogging: boolean = false;

    commands: KeyboardCommand[] = [];

    commandsVisible: boolean = false;
    commandsVisibleTimeout: any = undefined;

    constructor() {
        this.commands.push(
            new KeyboardCommand("Keyboard: Logging on/off", "L", command(this, "toggleLogging"))
        );
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

    onkeydown(event: KeyboardEvent) {
        let shortcut = toShortcut(event);
        if (this.enableLogging) {
            console.log("onkeydown", event, shortcut);
        }

        let handled = this.hideCommands_();

        if (!handled) {
            if (shortcut == "^") {
                this.showCommands_();
                return;
            }

            let commands = this.commands.filter(command => command.enabled && (command.shortcut === shortcut));

            for (let command of commands) {
                handled = true;
                if (command.action(shortcut)) {
                    break;
                }
            }
        }

        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    onkeyup(event: KeyboardEvent) {
        let shortcut = toShortcut(event);
        if (this.enableLogging) {
            console.log("onkeyup", event, shortcut);
        }

        this.hideCommands_();
    }
}
