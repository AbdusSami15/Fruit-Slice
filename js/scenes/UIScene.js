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

    // Score panel with gradient background
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0xffc300, 1);
    scoreBg.fillRoundedRect(m(10), m(10), m(180), m(50), m(12));
    scoreBg.fillStyle(0xffaa00, 1);
    scoreBg.fillRoundedRect(m(12), m(12), m(176), m(46), m(10));
    
    this.scoreText = this.add.text(m(100), m(35), "0", {
      fontFamily: "Arial Black",
      fontSize: fs(32) + "px",
      color: "#6b3e00",
      stroke: "#ffffff",
      strokeThickness: 3
    }).setOrigin(0.5);

    // Lives panel with red theme
    const livesBg = this.add.graphics();
    livesBg.fillStyle(0xff4d6d, 1);
    livesBg.fillRoundedRect(width - m(140), m(10), m(130), m(50), m(12));
    livesBg.fillStyle(0xff3355, 1);
    livesBg.fillRoundedRect(width - m(138), m(12), m(126), m(46), m(10));
    
    // Lives with heart icons
    this.livesContainer = this.add.container(width - m(75), m(35));
    this.updateLivesDisplay(3);

    // Pause button - colorful
    this.createPauseButton(width - m(40), m(90));

    // Pause overlay
    this.createPauseOverlay();

    // Combo text - more vibrant
    this.comboText = this.add.text(width / 2, height * 0.35, "", {
      fontFamily: "Arial Black",
      fontSize: fs(56) + "px",
      color: "#ffee00",
      stroke: "#ff6600",
      strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: "#000000", blur: 8, fill: true }
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

  updateLivesDisplay(lives) {
    const { width, height } = this.scale;
    const m = (val) => ScaleManager.scale(val, width, height);
    
    this.livesContainer.removeAll(true);
    
    for (let i = 0; i < 3; i++) {
      const heartX = (i - 1) * m(30);
      const color = i < lives ? 0xff0000 : 0x444444;
      
      // Heart shape using graphics
      const heart = this.add.graphics();
      heart.fillStyle(color, 1);
      heart.fillCircle(heartX - m(6), -m(4), m(8));
      heart.fillCircle(heartX + m(6), -m(4), m(8));
      heart.fillTriangle(
        heartX - m(14), m(0),
        heartX + m(14), m(0),
        heartX, m(14)
      );
      this.livesContainer.add(heart);
    }
  }

  createPauseButton(x, y) {
    const { width, height } = this.scale;
    const size = ScaleManager.scale(28, width, height);
    
    this.pauseBtn = this.add.container(x, y);
    
    // Colorful gradient-like background
    const bg2 = this.add.circle(0, 0, size + 3, 0x000000, 0.3);
    const bg = this.add.circle(0, 0, size, 0x4361ee, 1);
    bg.setStrokeStyle(3, 0x7c3aed, 1);
    
    const barW = size * 0.2;
    const barH = size * 0.6;
    const bar1 = this.add.rectangle(-size*0.22, 0, barW, barH, 0xffffff);
    const bar2 = this.add.rectangle(size*0.22, 0, barW, barH, 0xffffff);

    this.pauseBtn.add([bg2, bg, bar1, bar2]);
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

    this.pauseBg = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.75);
    
    // Colorful panel with border
    const panelShadow = this.add.rectangle(m(5), m(5), m(380), m(350), 0x000000, 0.5);
    panelShadow.setStrokeStyle(0);
    
    const panelBorder = this.add.graphics();
    panelBorder.fillGradientStyle(0x7c3aed, 0x4361ee, 0x4361ee, 0x7c3aed, 1);
    panelBorder.fillRoundedRect(m(-195), m(-180), m(390), m(360), m(20));
    
    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 1);
    panel.fillRoundedRect(m(-185), m(-170), m(370), m(340), m(16));

    const title = this.add.text(0, m(-120), "⏸ PAUSED", {
      fontFamily: "Arial Black",
      fontSize: fs(42) + "px",
      color: "#ffc300",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.pauseContainer.add([this.pauseBg, panelShadow, panelBorder, panel, title]);
    
    // Colorful buttons
    const resumeBtn = this.createOverlayButton(0, m(-20), "▶ RESUME", 0x10b981, 0x059669, () => this.togglePause());
    const homeBtn = this.createOverlayButton(0, m(70), "🏠 MAIN MENU", 0xf59e0b, 0xd97706, () => this.goToMenu());
    
    this.pauseContainer.add([...resumeBtn, ...homeBtn]);
  }

  createOverlayButton(x, y, label, color1, color2, onClick) {
    const { width, height } = this.scale;
    const fs = (base) => ScaleManager.fontSize(base, width, height);
    const m = (val) => ScaleManager.scale(val, width, height);

    const container = this.add.container(x, y);
    
    // Button shadow
    const shadow = this.add.rectangle(m(3), m(3), m(260), m(55), 0x000000, 0.4);
    shadow.setStrokeStyle(0);
    
    // Gradient-like button
    const bg = this.add.graphics();
    bg.fillStyle(color1, 1);
    bg.fillRoundedRect(m(-130), m(-27), m(260), m(54), m(12));
    bg.fillStyle(color2, 1);
    bg.fillRoundedRect(m(-125), m(-5), m(250), m(28), m(8));
    
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: fs(20) + "px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5);

    // Hit area for interaction
    const hitArea = this.add.rectangle(0, 0, m(260), m(55), 0xffffff, 0);
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
    this.scoreText.setText(score.toString());
    // Pop animation on score change
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.2,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  updateLives(lives) {
    this.updateLivesDisplay(lives);
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
