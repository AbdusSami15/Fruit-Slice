/**
 * GameOverScene - Final score display, restart and home buttons
 */
class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.isNewBest = data.isNewBest || false;
  }

  create() {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    this.container = this.add.container(width / 2, height / 2);

    const panel = this.add.rectangle(0, 0, m(480), m(480), 0x111827, 1);
    panel.setStrokeStyle(4, 0xffffff, 0.15);

    const title = this.add.text(0, m(-160), "GAME OVER", {
      fontFamily: "Arial Black", fontSize: fs(52) + "px", color: "#ffffff"
    }).setOrigin(0.5);

    const scoreValue = this.add.text(0, m(-15), `${this.finalScore}`, {
      fontFamily: "Arial Black", fontSize: fs(56) + "px", color: "#4cc9f0"
    }).setOrigin(0.5);

    const bestScore = StorageManager.getBestScore("default");
    const bestText = this.add.text(0, m(45), this.isNewBest ? "🏆 NEW BEST! 🏆" : `Best: ${bestScore}`, {
      fontFamily: "Arial Black", fontSize: fs(24) + "px", color: "#ffc300"
    }).setOrigin(0.5);

    const restartBtn = this.createButton(0, m(120), "PLAY AGAIN", 0xf72585, () => this.restartGame());
    const homeBtn = this.createButton(0, m(195), "MAIN MENU", 0x4361ee, () => this.goToMenu());

    this.container.add([panel, title, scoreValue, bestText, ...restartBtn, ...homeBtn]);
    
    // Proper resize handling
    const resizeHandler = () => {
      if (this.scene.isActive()) this.scene.restart();
    };
    this.scale.on("resize", resizeHandler);
    this.events.once("shutdown", () => {
      this.scale.off("resize", resizeHandler);
    });
  }

  createButton(x, y, label, color, onClick) {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, m(280), m(60), color, 1);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black", fontSize: fs(24) + "px", color: "#ffffff"
    }).setOrigin(0.5);

    container.add([bg, txt]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    return [container];
  }

  restartGame() {
    // Stop UI first
    this.scene.stop("UIScene");
    
    // Starting GameScene will automatically stop GameOverScene
    this.scene.start("GameScene");
    
    // Launch UI once GameScene is ready
    this.scene.launch("UIScene");
  }

  goToMenu() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    this.scene.stop("GameOverScene");
    this.scene.stop("GameScene");
    this.scene.start("MenuScene");
  }
}
