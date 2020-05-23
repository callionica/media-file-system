class App {
    environment: Environment;
    list: List;
    player: Player;
    keyboardController: KeyboardController;

    constructor() {
        this.environment = new Environment();
        this.list = new List();
        this.player = new Player();

        this.keyboardController = (() => {
            let keyboardController = new KeyboardController();

            keyboardController.commands.push(...this.environment.commands);
            keyboardController.commands.push(...this.list.commands);
            keyboardController.commands.push(...this.player.commands);

            document.onkeydown = (e) => keyboardController.onkeydown(e);
            document.onkeyup = (e) => keyboardController.onkeyup(e);

            return keyboardController;
        })();

    }

    up() {
        console.log("up");
    }

    down() {
        console.log("down");
    }

}
