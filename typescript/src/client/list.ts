class List {
    commands: KeyboardCommand[];

    constructor() {
        this.commands = [
            new KeyboardCommand("List: Back", "Delete", command(this, "back")),
            new KeyboardCommand("List: Forward", "⇧Delete", command(this, "forward")),
            new KeyboardCommand("List: Previous item", "↑", command(this, "previous")),
            new KeyboardCommand("List: Next item", "↓", command(this, "next")),
            new KeyboardCommand("List: First item", "⌘↑", command(this, "first")),
            new KeyboardCommand("List: Last item", "⌘↓", command(this, "last")),
            new KeyboardCommand("List: Activate item", "Enter", command(this, "activate")),
        ];
    }

    back() {
    }

    forward() {
    }

    previous() {
    }

    next() {
    }

    first() {
    }

    last() {
    }

    activate() {
    }
}