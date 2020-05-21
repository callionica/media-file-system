class App {
    environment: Environment;
    keyboardController: KeyboardController;

    constructor() {
        this.environment = new Environment();
        this.keyboardController = (function (){
            let keyboardController = new KeyboardController();
            document.onkeydown = (e) => keyboardController.onkeydown(e);
            document.onkeyup = (e) => keyboardController.onkeyup(e);
            return keyboardController;
        })();

    }
}