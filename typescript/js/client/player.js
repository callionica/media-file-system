"use strict";
class Player {
    constructor() {
        this.commands = [
            new KeyboardCommand("Player: Play/Pause", "Space", command(this, "playPause")),
            new KeyboardCommand("Player: Play/Pause", "F8", command(this, "playPause")),
            new KeyboardCommand("Player: Jump Forward", "→", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump Forward", "F9", command(this, "jumpForward")),
            new KeyboardCommand("Player: Jump to End", "⇧→", command(this, "jumpEnd")),
            new KeyboardCommand("Player: Jump Back", "←", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump Back", "F7", command(this, "jumpBack")),
            new KeyboardCommand("Player: Jump to Start", "⇧←", command(this, "jumpStart")),
            new KeyboardCommand("Player: Volume Up", "⇧↑", command(this, "volumeUp")),
            new KeyboardCommand("Player: Volume Down", "⇧↓", command(this, "volumeDown")),
            new KeyboardCommand("Player: Subtitles On/Off", "S", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Subtitles On/Off", "ClosedCaptionToggle", command(this, "toggleSubtitles")),
            new KeyboardCommand("Player: Subtitles Next", "⇧S", command(this, "nextSubtitle")),
            new KeyboardCommand("Player: Picture-in-picture On/Off", "P", command(this, "togglePIP")),
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
//# sourceMappingURL=player.js.map