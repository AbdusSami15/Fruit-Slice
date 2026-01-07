/**
 * UIScene - HUD overlay: score, lives, pause button
 * Runs parallel to GameScene
 */
class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create() {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    // Score text
    this.scoreText = this.add.text(s(16), s(16), "SCORE: 0", {
      fontFamily: "Arial Black",
      fontSize: fs(22) + "px",
      color: "#ffffff"
    });

    // Lives text
    this.livesText = this.add.text(width - s(16), s(16), "LIVES: 3", {
      fontFamily: "Arial Black",
      fontSize: fs(22) + "px",
      color: "#ffffff"
    }).setOrigin(1, 0);

    // Pause button
    this.createPauseButton(width - s(24), s(60));

    // Pause overlay (hidden initially)
    this.createPauseOverlay();

    // Combo text (centered, hidden initially)
    this.comboText = this.add.text(width / 2, height * 0.35, "", {
      fontFamily: "Arial Black",
      fontSize: fs(40) + "px",
      color: "#ffc300",
      stroke: "#000000",
      strokeThickness: s(4)
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    // Listen for game events
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("update-score", this.updateScore, this);
    gameScene.events.on("update-lives", this.updateLives, this);
    gameScene.events.on("show-combo", this.showCombo, this);

    // Handle resize
    this.scale.on("resize", this.handleResize, this);
  }

  createPauseButton(x, y) {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);

    this.pauseBtn = this.add.container(x, y);

    const bg = this.add.circle(0, 0, s(18), 0x333333, 0.8);
    bg.setStrokeStyle(s(2), 0xffffff, 0.3);

    const bar1 = this.add.rectangle(-s(4), 0, s(4), s(14), 0xffffff);
    const bar2 = this.add.rectangle(s(4), 0, s(4), s(14), 0xffffff);

    this.pauseBtn.add([bg, bar1, bar2]);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => this.pauseBtn.setScale(1.1));
    bg.on("pointerout", () => this.pauseBtn.setScale(1.0));
    bg.on("pointerdown", () => this.togglePause());
  }

  createPauseOverlay() {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    this.pauseContainer = this.add.container(width / 2, height / 2);
    this.pauseContainer.setVisible(false);
    this.pauseContainer.setDepth(3000);

    // Dim background
    this.pauseBg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);

    // Panel
    const panel = this.add.rectangle(0, 0, s(320), s(300), 0x111827, 1);
    panel.setStrokeStyle(s(2), 0xffffff, 0.15);

    // Title
    const title = this.add.text(0, -s(100), "PAUSED", {
      fontFamily: "Arial Black",
      fontSize: fs(36) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // Sound toggle row
    this.createPauseSoundToggle(s);

    // Resume button
    const resumeBtn = this.createOverlayButton(0, s(20), "RESUME", 0x52b788, () => {
      this.togglePause();
    });

    // Home button
    const homeBtn = this.createOverlayButton(0, s(80), "MAIN MENU", 0x4361ee, () => {
      this.goToMenu();
    });

    this.pauseContainer.add([this.pauseBg, panel, title, ...resumeBtn, ...homeBtn]);
  }

  createPauseSoundToggle(s) {
    const { width, height } = this.scale;
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    const soundEnabled = this.registry.get("soundEnabled");
    
    const soundLabel = this.add.text(-s(60), -s(40), "Sound:", {
      fontFamily: "Arial Black",
      fontSize: fs(16) + "px",
      color: "#888888"
    }).setOrigin(0, 0.5);

    this.pauseSoundBtn = this.add.container(s(50), -s(40));
    
    const bg = this.add.rectangle(0, 0, s(80), s(32), soundEnabled ? 0x52b788 : 0x444444);
    bg.setStrokeStyle(s(1), 0xffffff, 0.2);
    
    this.pauseSoundText = this.add.text(0, 0, soundEnabled ? "ON" : "OFF", {
      fontFamily: "Arial Black",
      fontSize: fs(14) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);
    
    this.pauseSoundBtn.add([bg, this.pauseSoundText]);
    this.pauseSoundBtn.bg = bg;
    
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => this.pauseSoundBtn.setScale(1.05));
    bg.on("pointerout", () => this.pauseSoundBtn.setScale(1.0));
    bg.on("pointerdown", () => {
      const newState = !this.registry.get("soundEnabled");
      this.registry.set("soundEnabled", newState);
      StorageManager.setSoundEnabled(newState);
      this.pauseSoundText.setText(newState ? "ON" : "OFF");
      this.pauseSoundBtn.bg.setFillStyle(newState ? 0x52b788 : 0x444444);
    });

    this.pauseContainer.add([soundLabel, this.pauseSoundBtn]);
  }

  createOverlayButton(x, y, label, color, onClick) {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, s(200), s(44), color, 1);
    bg.setStrokeStyle(s(2), 0xffffff, 0.25);

    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: fs(16) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);

    container.add([bg, txt]);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => container.setScale(1.05));
    bg.on("pointerout", () => container.setScale(1.0));
    bg.on("pointerdown", () => container.setScale(0.95));
    bg.on("pointerup", () => {
      container.setScale(1.05);
      onClick();
    });

    return [container];
  }

  togglePause() {
    const gameScene = this.scene.get("GameScene");
    
    if (this.pauseContainer.visible) {
      this.pauseContainer.setVisible(false);
      
      const soundEnabled = this.registry.get("soundEnabled");
      this.pauseSoundText.setText(soundEnabled ? "ON" : "OFF");
      this.pauseSoundBtn.bg.setFillStyle(soundEnabled ? 0x52b788 : 0x444444);
      
      gameScene.events.emit("resume-game");
    } else {
      const soundEnabled = this.registry.get("soundEnabled");
      this.pauseSoundText.setText(soundEnabled ? "ON" : "OFF");
      this.pauseSoundBtn.bg.setFillStyle(soundEnabled ? 0x52b788 : 0x444444);
      
      this.pauseContainer.setVisible(true);
      gameScene.events.emit("pause-game");
    }
  }

  goToMenu() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    }
    
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    
    this.scene.stop("GameScene");
    this.scene.stop("UIScene");
    this.scene.start("MenuScene");
  }

  updateScore(score) {
    this.scoreText.setText(`SCORE: ${score}`);
  }

  updateLives(lives) {
    this.livesText.setText(`LIVES: ${lives}`);
    
    if (lives <= 1) {
      this.livesText.setColor("#ff4d6d");
    } else {
      this.livesText.setColor("#ffffff");
    }
  }

  showCombo(count) {
    const { width, height } = this.scale;
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    let message, color;
    if (count >= 6) {
      message = `🔥 AMAZING x${count}! 🔥`;
      color = "#ff4d6d";
    } else if (count >= 4) {
      message = `⚡ GREAT x${count}! ⚡`;
      color = "#ff8c42";
    } else {
      message = `✨ COMBO x${count}! ✨`;
      color = "#ffc300";
    }

    this.comboText.setText(message);
    this.comboText.setFontSize(fs(40));
    this.comboText.setColor(color);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);

    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({
      targets: this.comboText,
      scale: 1.2,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          scale: 0.8,
          y: this.comboText.y - 30,
          duration: 600,
          delay: 400,
          ease: "Cubic.easeIn",
          onComplete: () => {
            this.comboText.setY(this.scale.height * 0.35);
          }
        });
      }
    });
  }

  handleResize() {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    
    this.livesText.setX(width - s(16));
    this.pauseBtn.setPosition(width - s(24), s(60));
    this.comboText.setPosition(width / 2, height * 0.35);
    
    this.pauseContainer.setPosition(width / 2, height / 2);
    this.pauseBg.setSize(width, height);
  }

  shutdown() {
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.off("update-score", this.updateScore, this);
      gameScene.events.off("update-lives", this.updateLives, this);
      gameScene.events.off("show-combo", this.showCombo, this);
    }
    this.scale.off("resize", this.handleResize, this);
  }
}
