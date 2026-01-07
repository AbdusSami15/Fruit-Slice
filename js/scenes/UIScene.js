/**
 * UIScene - HUD overlay using HTML elements for crisp rendering
 */
class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create() {
    const { width, height } = this.scale;

    // Get HTML UI elements
    this.uiOverlay = document.getElementById('ui-overlay');
    this.scoreValue = document.getElementById('score-value');
    this.hearts = document.querySelectorAll('.heart');
    this.pauseBtn = document.getElementById('pause-btn');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('resume-btn');
    this.menuBtn = document.getElementById('menu-btn');

    // Show UI overlay
    this.uiOverlay.classList.add('active');

    // Bind methods for proper event listener removal
    this.boundTogglePause = () => this.togglePause();
    this.boundGoToMenu = () => this.goToMenu();

    // Setup pause button
    this.pauseBtn.addEventListener('click', this.boundTogglePause);
    this.resumeBtn.addEventListener('click', this.boundTogglePause);
    this.menuBtn.addEventListener('click', this.boundGoToMenu);

    // Combo text - keep in Phaser canvas for animations
    const fs = (base) => ScaleManager.fontSize(base, width, height);
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
    if (gameScene) {
      gameScene.events.on("update-score", this.updateScore, this);
      gameScene.events.on("update-lives", this.updateLives, this);
      gameScene.events.on("show-combo", this.showCombo, this);
    }

    // Cleanup on shutdown
    this.events.once("shutdown", () => {
      // Hide HTML UI
      if (this.uiOverlay) this.uiOverlay.classList.remove('active');
      if (this.pauseOverlay) this.pauseOverlay.classList.remove('active');
      
      // Remove event listeners
      if (this.pauseBtn) this.pauseBtn.removeEventListener('click', this.boundTogglePause);
      if (this.resumeBtn) this.resumeBtn.removeEventListener('click', this.boundTogglePause);
      if (this.menuBtn) this.menuBtn.removeEventListener('click', this.boundGoToMenu);
      
      // Clean up game scene listeners
      if (gameScene) {
        gameScene.events.off("update-score", this.updateScore, this);
        gameScene.events.off("update-lives", this.updateLives, this);
        gameScene.events.off("show-combo", this.showCombo, this);
      }
    });
  }

  togglePause() {
    const gameScene = this.scene.get("GameScene");
    const isActive = this.pauseOverlay.classList.contains('active');
    
    if (isActive) {
      this.pauseOverlay.classList.remove('active');
      gameScene.events.emit("resume-game");
    } else {
      this.pauseOverlay.classList.add('active');
      gameScene.events.emit("pause-game");
    }
  }

  goToMenu() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    this.scene.stop("GameScene");
    this.scene.stop("UIScene");
    this.scene.start("MenuScene");
  }

  updateScore(score) {
    this.scoreValue.textContent = score.toString();
    // CSS animation for pop effect
    this.scoreValue.style.animation = 'none';
    setTimeout(() => {
      this.scoreValue.style.animation = 'scorePop 0.2s ease';
    }, 10);
  }

  updateLives(lives) {
    this.hearts.forEach((heart, index) => {
      if (index < lives) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  showCombo(count) {
    const { width, height } = this.scale;
    this.comboText.setText(`COMBO x${count}!`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);
    this.comboText.setPosition(width / 2, height * 0.35);
    
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
          onComplete: () => {
            this.comboText.setY(height * 0.35);
          }
        });
      }
    });
  }
}
