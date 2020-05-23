
class Player {
    commands: KeyboardCommand[];

    constructor() {
        this.commands = [
            new KeyboardCommand("Play/Pause", "Space", command(this, "playPause")),
            new KeyboardCommand("Play/Pause", "F8", command(this, "playPause")),
            new KeyboardCommand("Jump: Forward", "→", command(this, "jumpForward")),
            new KeyboardCommand("Jump: Forward", "F9", command(this, "jumpForward")),
            new KeyboardCommand("Jump: End", "⇧→", command(this, "jumpEnd")),
            new KeyboardCommand("Jump: Back", "←", command(this, "jumpBack")),
            new KeyboardCommand("Jump: Back", "F7", command(this, "jumpBack")),
            new KeyboardCommand("Jump: Start", "⇧←", command(this, "jumpStart")),
            new KeyboardCommand("Volume: Up", "⇧↑", command(this, "volumeUp")),
            new KeyboardCommand("Volume: Down", "⇧↓", command(this, "volumeDown")),
            new KeyboardCommand("Subtitles: On/Off", "S", command(this, "toggleSubtitles")),
            new KeyboardCommand("Subtitles: On/Off", "ClosedCaptionToggle", command(this, "toggleSubtitles")),
            new KeyboardCommand("Subtitles: Next", "⇧S", command(this, "nextSubtitle")),
            new KeyboardCommand("Picture-in-picture: On/Off", "P", command(this, "togglePIP")),
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