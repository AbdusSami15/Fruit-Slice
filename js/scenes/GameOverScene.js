/**
 * GameOverScene - Final score display, restart and home buttons
 */
class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.difficulty = data.difficulty || "normal";
    this.isNewBest = data.isNewBest || false;
  }

  create() {
    const { width, height } = this.scale;

    // Semi-transparent overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    this.overlay.setDepth(2000);

    // Main container
    this.container = this.add.container(width / 2, height / 2);
    this.container.setDepth(2100);

    // Panel background
    const panel = this.add.rectangle(0, 0, 480, 480, 0x111827, 1);
    panel.setStrokeStyle(4, 0xffffff, 0.15);

    // Game Over title
    const title = this.add.text(0, -160, "GAME OVER", {
      fontFamily: "Arial Black",
      fontSize: "52px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // Difficulty label
    const diffLabel = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
    const diffColors = { easy: "#52b788", normal: "#4361ee", hard: "#f72585" };
    
    const diffText = this.add.text(0, -100, diffLabel.toUpperCase(), {
      fontFamily: "Arial Black",
      fontSize: "18px",
      color: diffColors[this.difficulty] || "#888888"
    }).setOrigin(0.5);

    // Score display
    const scoreLabel = this.add.text(0, -60, "SCORE", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#888888"
    }).setOrigin(0.5);

    const scoreValue = this.add.text(0, -15, `${this.finalScore}`, {
      fontFamily: "Arial Black",
      fontSize: "56px",
      color: "#4cc9f0"
    }).setOrigin(0.5);

    // Best score display
    const bestScore = StorageManager.getBestScore(this.difficulty);
    let bestScoreContent = [];
    
    if (this.isNewBest && this.finalScore > 0) {
      // New best animation
      const newBestText = this.add.text(0, 45, "🏆 NEW BEST! 🏆", {
        fontFamily: "Arial Black",
        fontSize: "26px",
        color: "#ffc300"
      }).setOrigin(0.5);
      
      // Pulse animation
      this.tweens.add({
        targets: newBestText,
        scale: { from: 1, to: 1.15 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      // Sparkle effect
      this.tweens.add({
        targets: newBestText,
        alpha: { from: 1, to: 0.7 },
        duration: 200,
        yoyo: true,
        repeat: -1
      });
      
      bestScoreContent.push(newBestText);
    } else {
      const bestText = this.add.text(0, 45, `Best: ${bestScore}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#666666"
      }).setOrigin(0.5);
      
      bestScoreContent.push(bestText);
    }

    // Restart button
    const restartBtn = this.createButton(0, 120, "PLAY AGAIN", 0xf72585, () => {
      this.restartGame();
    });

    // Home button
    const homeBtn = this.createButton(0, 195, "MAIN MENU", 0x4361ee, () => {
      this.goToMenu();
    });

    this.container.add([panel, title, diffText, scoreLabel, scoreValue, ...bestScoreContent, ...restartBtn, ...homeBtn]);

    // Entrance animation
    this.container.setAlpha(0);
    this.container.setScale(0.9);
    
    this.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut"
    });

    // Handle resize
    this.scale.on("resize", this.handleResize, this);
  }

  createButton(x, y, label, color, onClick) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 280, 60, color, 1);
    bg.setStrokeStyle(3, 0xffffff, 0.25);

    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: "24px",
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

  restartGame() {
    this.cameras.main.fadeOut(200, 11, 15, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop("GameOverScene");
      this.scene.stop("GameScene");
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }

  goToMenu() {
    this.cameras.main.fadeOut(200, 11, 15, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      // Exit fullscreen when returning to menu
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      }
      
      // Unlock orientation
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
      
      this.scene.stop("GameOverScene");
      this.scene.stop("GameScene");
      this.scene.start("MenuScene");
    });
  }

  handleResize() {
    const { width, height } = this.scale;
    
    this.overlay.setPosition(width / 2, height / 2);
    this.overlay.setSize(width, height);
    this.container.setPosition(width / 2, height / 2);
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
  }
}

