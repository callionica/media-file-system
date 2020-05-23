class List {
    commands: KeyboardCommand[];

    constructor() {
        this.commands = [
            // Up a level
            new KeyboardCommand("List: Back", "Delete", command(this, "back")),
            // Down a level if we've already been down a level
            new KeyboardCommand("List: Forward", "⇧Delete", command(this, "forward")),
            new KeyboardCommand("List: Forward", "↑", command(this, "previous")),
            new KeyboardCommand("List: Forward", "↓", command(this, "next")),
            
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
}