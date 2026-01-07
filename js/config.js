/**
 * Phaser Game Configuration
 * Entry point - creates the game instance with all scenes
 */

const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0f14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
    parent: "game",
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

