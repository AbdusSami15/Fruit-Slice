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

    this.overlay = this.add.rectangle(width / 2, height / 2, width * 2, height * 2, 0x000000, 0.8);
    this.container = this.add.container(width / 2, height / 2);

    // Colorful panel with gradient border
    const panelShadow = this.add.rectangle(m(6), m(6), m(400), m(380), 0x000000, 0.5);
    
    const panelBorder = this.add.graphics();
    panelBorder.fillGradientStyle(0xf72585, 0x7209b7, 0x4361ee, 0x4cc9f0, 1);
    panelBorder.fillRoundedRect(m(-205), m(-195), m(410), m(390), m(24));
    
    const panel = this.add.graphics();
    panel.fillStyle(0x0f0a1e, 1);
    panel.fillRoundedRect(m(-195), m(-185), m(390), m(370), m(20));

    const title = this.add.text(0, m(-140), "💀 GAME OVER", {
      fontFamily: "Arial Black", fontSize: fs(42) + "px", color: "#ff4d6d",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(0, m(-70), "YOUR SCORE", {
      fontFamily: "Arial", fontSize: fs(18) + "px", color: "#888888"
    }).setOrigin(0.5);

    const scoreValue = this.add.text(0, m(-20), `${this.finalScore}`, {
      fontFamily: "Arial Black", fontSize: fs(64) + "px", color: "#4cc9f0",
      stroke: "#1e3a5f", strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 10, fill: true }
    }).setOrigin(0.5);

    const bestScore = StorageManager.getBestScore("default");
    const bestText = this.add.text(0, m(50), this.isNewBest ? "🏆 NEW BEST! 🏆" : `🏆 Best: ${bestScore}`, {
      fontFamily: "Arial Black", fontSize: fs(22) + "px", 
      color: this.isNewBest ? "#ffc300" : "#888888",
      stroke: "#000000", strokeThickness: 2
    }).setOrigin(0.5);

    // Animate new best
    if (this.isNewBest) {
      this.tweens.add({
        targets: bestText,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }

    const restartBtn = this.createButton(0, m(110), "▶ PLAY AGAIN", 0x10b981, 0x059669, () => this.restartGame());
    const homeBtn = this.createButton(0, m(175), "🏠 MAIN MENU", 0x6366f1, 0x4f46e5, () => this.goToMenu());

    this.container.add([panelShadow, panelBorder, panel, title, scoreLabel, scoreValue, bestText, ...restartBtn, ...homeBtn]);
    
    // Proper resize handling
    const resizeHandler = () => {
      if (this.scene.isActive()) this.scene.restart();
    };
    this.scale.on("resize", resizeHandler);
    this.events.once("shutdown", () => {
      this.scale.off("resize", resizeHandler);
    });
  }

  createButton(x, y, label, color1, color2, onClick) {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    const container = this.add.container(x, y);
    
    // Shadow
    const shadow = this.add.rectangle(m(3), m(3), m(260), m(50), 0x000000, 0.4);
    
    // Gradient-like button
    const bg = this.add.graphics();
    bg.fillStyle(color1, 1);
    bg.fillRoundedRect(m(-130), m(-25), m(260), m(50), m(12));
    bg.fillStyle(color2, 1);
    bg.fillRoundedRect(m(-125), m(-3), m(250), m(25), m(8));
    
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black", fontSize: fs(20) + "px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 2
    }).setOrigin(0.5);

    // Hit area
    const hitArea = this.add.rectangle(0, 0, m(260), m(50), 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => container.setScale(0.95));
    hitArea.on("pointerup", () => {
      container.setScale(1);
      onClick();
    });
    hitArea.on("pointerout", () => container.setScale(1));

    container.add([shadow, bg, txt, hitArea]);
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
