/**
 * Phaser Game Configuration
 * Entry point - creates the game instance with all scenes
 */

const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0f14",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    fullscreenTarget: "game"
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene]
};

// Start the game
const game = new Phaser.Game(gameConfig);

