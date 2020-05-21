class KeyboardCommand {
    name: string;
    shortcut: string;
    action: (shortcut: string) => boolean;

    constructor(name: string, shortcut: string, action: (shortcut: string) => boolean) {
        this.name = name;
        this.shortcut = shortcut;
        this.action = action;
    }
}

function toShortcut(event: KeyboardEvent) {
    let command = event.metaKey ? "⌘" : "";
    let control = event.ctrlKey ? "^" : "";
    let alt = event.altKey ? "⌥" : "";
    let shift = event.shiftKey ? "⇧" : "";
    let key = event.key;
    return `${command}${control}${alt}${shift}${key}`;
}

class KeyboardController {
    commands: KeyboardCommand[] = [];

    route(event: KeyboardEvent) {
        let shortcut = toShortcut(event);
        let commands = this.commands.filter(command => command.shortcut === shortcut);
        let handled = false;
        for (let command of commands) {
            handled = command.action(shortcut);
            if (handled) {
                break;
            }
        }

        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
}