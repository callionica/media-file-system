"use strict";
class App {
    constructor() {
        this.environment = new Environment();
        this.list = new List();
        this.player = new Player();
        this.commands = [
            new KeyboardCommand("App: Video", "V", command(this, "video")),
            new KeyboardCommand("App: Weather", "W", command(this, "showWeather")),
            new KeyboardCommand("App: Time", "T", command(this, "showTime")),
        ];
        this.keyboardController = (() => {
            let keyboardController = new KeyboardController();
            keyboardController.commands.push(...this.environment.commands);
            keyboardController.commands.push(...this.commands);
            keyboardController.commands.push(...this.list.commands);
            keyboardController.commands.push(...this.player.commands);
            document.onkeydown = (e) => keyboardController.onkeydown(e);
            document.onkeyup = (e) => keyboardController.onkeyup(e);
            return keyboardController;
        })();
    }
    showWeather() {
    }
    showTime() {
    }
    video() {
        let player = document.getElementById("player");
        let layout = player.getAttribute("data-layout") || "maxi";
        if (layout != "mini") {
            layout = "mini";
        }
        else {
            layout = "maxi";
        }
        player.setAttribute("data-layout", layout);
    }
}
//# sourceMappingURL=app.js.map