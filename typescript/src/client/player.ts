
class Player extends Control {
    commands: KeyboardCommand[];

    constructor() {
        super();
        this.commands = [
            new KeyboardCommand("Player: Play/pause", "Space", command(this, "playPause")),
            new KeyboardCommand("Player: Play/pause", "F8", command(this, "playPause")),
            new KeyboardCommand("Player: Jump forward", "→", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump forward", "F9", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump to end", "⇧→", command(this, "jumpEnd")),
            new KeyboardCommand("Player: Jump back", "←", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump back", "F7", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump to start", "⇧←", command(this, "jumpStart")),
            new KeyboardCommand("Player: Volume up", "⇧↑", command(this, "volumeUp")),
            new KeyboardCommand("Player: Volume down", "⇧↓", command(this, "volumeDown")),
            new KeyboardCommand("Player: Subtitles on/off", "S", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Subtitles on/off", "ClosedCaptionToggle", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Next subtitle", "⇧S", command(this, "nextSubtitle")),
            new KeyboardCommand("Player: Picture-in-picture on/off", "P", command(this, "togglePIP")),
        ];
    }

    playPause() {
    }

    volumeUp() {
    }

    volumeDown() {
    }

    toggleSubtitles() {
    }

    nextSubtitle() {
    }

    jumpForward() {
    }

    jumpBack() {
    }

    jumpStart() {
    }

    jumpEnd() {
    }

    togglePIP() {
    }
}