/**
 * GameOverScene - Final score display using HTML for crisp rendering
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
    // Get HTML elements
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.gameoverScoreValue = document.getElementById('gameover-score-value');
    this.gameoverBest = document.getElementById('gameover-best');
    this.playAgainBtn = document.getElementById('playagain-btn');
    this.homeBtn = document.getElementById('home-btn');

    // Update content
    this.gameoverScoreValue.textContent = this.finalScore.toString();
    
    const bestScore = StorageManager.getBestScore("default");
    if (this.isNewBest) {
      this.gameoverBest.textContent = "🏆 NEW BEST! 🏆";
      this.gameoverBest.classList.add('new-best');
    } else {
      this.gameoverBest.textContent = `🏆 Best: ${bestScore}`;
      this.gameoverBest.classList.remove('new-best');
    }

    // Show overlay
    this.gameoverOverlay.classList.add('active');

    // Bind methods for proper cleanup
    this.boundRestartGame = () => this.restartGame();
    this.boundGoToMenu = () => this.goToMenu();

    // Setup buttons
    this.playAgainBtn.addEventListener('click', this.boundRestartGame);
    this.homeBtn.addEventListener('click', this.boundGoToMenu);

    // Cleanup on shutdown
    this.events.once("shutdown", () => {
      if (this.gameoverOverlay) this.gameoverOverlay.classList.remove('active');
      if (this.playAgainBtn) this.playAgainBtn.removeEventListener('click', this.boundRestartGame);
      if (this.homeBtn) this.homeBtn.removeEventListener('click', this.boundGoToMenu);
    });
  }

  restartGame() {
    // Hide overlay
    this.gameoverOverlay.classList.remove('active');
    
    // Stop UI first
    this.scene.stop("UIScene");
    
    // Starting GameScene will automatically stop GameOverScene
    this.scene.start("GameScene");
    
    // Launch UI once GameScene is ready
    this.scene.launch("UIScene");
  }

  goToMenu() {
    // Hide overlay
    this.gameoverOverlay.classList.remove('active');
    
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    this.scene.stop("GameOverScene");
    this.scene.stop("GameScene");
    this.scene.start("MenuScene");
  }
}
