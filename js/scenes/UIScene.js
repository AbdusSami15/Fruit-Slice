/**
 * UIScene - HUD overlay: score, lives, pause button
 */
class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create() {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    // Score text
    this.scoreText = this.add.text(m(20), m(20), "SCORE: 0", {
      fontFamily: "Arial Black",
      fontSize: fs(28) + "px",
      color: "#ffffff"
    });

    // Lives text
    this.livesText = this.add.text(width - m(20), m(20), "LIVES: 3", {
      fontFamily: "Arial Black",
      fontSize: fs(28) + "px",
      color: "#ffffff"
    }).setOrigin(1, 0);

    // Pause button
    this.createPauseButton(width - m(30), m(80));

    // Pause overlay
    this.createPauseOverlay();

    // Combo text
    this.comboText = this.add.text(width / 2, height * 0.35, "", {
      fontFamily: "Arial Black",
      fontSize: fs(52) + "px",
      color: "#ffc300",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    // Listen for events
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("update-score", this.updateScore, this);
    gameScene.events.on("update-lives", this.updateLives, this);
    gameScene.events.on("show-combo", this.showCombo, this);

    // Proper resize handling to prevent accumulation
    const resizeHandler = () => {
      if (this.scene.isActive()) this.scene.restart();
    };
    this.scale.on("resize", resizeHandler);
    this.events.once("shutdown", () => {
      this.scale.off("resize", resizeHandler);
      // Clean up game scene listeners
      if (gameScene) {
        gameScene.events.off("update-score", this.updateScore, this);
        gameScene.events.off("update-lives", this.updateLives, this);
        gameScene.events.off("show-combo", this.showCombo, this);
      }
    });
  }

  createPauseButton(x, y) {
    const { width, height } = this.scale;
    const size = ScaleManager.scale(24, width, height);
    
    this.pauseBtn = this.add.container(x, y);
    const bg = this.add.circle(0, 0, size, 0x333333, 0.8);
    bg.setStrokeStyle(2, 0xffffff, 0.3);
    
    const barW = size * 0.25;
    const barH = size * 0.75;
    const bar1 = this.add.rectangle(-size*0.25, 0, barW, barH, 0xffffff);
    const bar2 = this.add.rectangle(size*0.25, 0, barW, barH, 0xffffff);

    this.pauseBtn.add([bg, bar1, bar2]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.togglePause());
  }

  createPauseOverlay() {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    this.pauseContainer = this.add.container(width / 2, height / 2);
    this.pauseContainer.setVisible(false);
    this.pauseContainer.setDepth(3000);

    this.pauseBg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    const panel = this.add.rectangle(0, 0, m(400), m(420), 0x111827, 1);
    panel.setStrokeStyle(3, 0xffffff, 0.15);

    const title = this.add.text(0, m(-140), "PAUSED", {
      fontFamily: "Arial Black",
      fontSize: fs(48) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.pauseContainer.add([this.pauseBg, panel, title]);
    
    // Resume/Home buttons
    const resumeBtn = this.createOverlayButton(0, m(20), "RESUME", 0x52b788, () => this.togglePause());
    const homeBtn = this.createOverlayButton(0, m(100), "MAIN MENU", 0x4361ee, () => this.goToMenu());
    
    this.pauseContainer.add([...resumeBtn, ...homeBtn]);
  }

  createOverlayButton(x, y, label, color, onClick) {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, m(260), m(60), color, 1);
    bg.setStrokeStyle(2, 0xffffff, 0.25);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: fs(22) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);

    container.add([bg, txt]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    return [container];
  }

  togglePause() {
    const gameScene = this.scene.get("GameScene");
    const isVisible = !this.pauseContainer.visible;
    this.pauseContainer.setVisible(isVisible);
    gameScene.events.emit(isVisible ? "pause-game" : "resume-game");
  }

  goToMenu() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    this.scene.stop("GameScene");
    this.scene.stop("UIScene");
    this.scene.start("MenuScene");
  }

  updateScore(score) {
    this.scoreText.setText(`SCORE: ${score}`);
  }

  updateLives(lives) {
    this.livesText.setText(`LIVES: ${lives}`);
  }

  showCombo(count) {
    this.comboText.setText(`COMBO x${count}!`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);
    this.tweens.add({
      targets: this.comboText,
      scale: 1.2,
      duration: 200,
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          y: this.comboText.y - 30,
          duration: 600,
          delay: 400,
          onComplete: () => this.comboText.setY(this.scale.height * 0.35)
        });
      }
    });
  }

  handleResize() {
    this.scene.restart();
  }
}
