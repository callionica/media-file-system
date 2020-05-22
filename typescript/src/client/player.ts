
class Player {
    commands: KeyboardCommand[];

    constructor() {
        this.commands = [
            new KeyboardCommand("Play/Pause", "Space", command(this, "playPause")),
            new KeyboardCommand("Volume: Up", "⇧ArrowUp", command(this, "volumeUp")),
            new KeyboardCommand("Volume: Down", "⇧ArrowDown", command(this, "volumeDown")),
        ];
    }

    playPause() {
    }

    volumeUp() {
    }

    volumeDown() {
    }
}