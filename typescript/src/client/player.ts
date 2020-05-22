
class Player {
    commands: KeyboardCommand[];

    constructor() {
        this.commands = [
            new KeyboardCommand("Play/Pause", "Space", command(this, "playPause")),
        ];
    }

    playPause() {
        console.log("Play/Pause");
    }
}