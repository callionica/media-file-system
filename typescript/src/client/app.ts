class App {
    environment: Environment;
    keyboardController: KeyboardController;

    constructor() {
        this.environment = new Environment();
        this.keyboardController = (() => {
            let keyboardController = new KeyboardController();

            keyboardController.commands.push(...this.environment.commands);

            document.onkeydown = (e) => keyboardController.onkeydown(e);
            document.onkeyup = (e) => keyboardController.onkeyup(e);

            return keyboardController;
        })();

    }
}
