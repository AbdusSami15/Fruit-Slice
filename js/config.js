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
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: "game"
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

// Force resize on any screen change
function forceResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (game && game.scale) {
    game.scale.resize(w, h);
    game.scale.refresh();
  }
}

// Handle fullscreen changes
document.addEventListener("fullscreenchange", () => {
  setTimeout(forceResize, 50);
  setTimeout(forceResize, 200);
});
document.addEventListener("webkitfullscreenchange", () => {
  setTimeout(forceResize, 50);
  setTimeout(forceResize, 200);
});

// Handle window resize
window.addEventListener("resize", () => {
  setTimeout(forceResize, 50);
});

// Handle orientation change on mobile
window.addEventListener("orientationchange", () => {
  setTimeout(forceResize, 100);
  setTimeout(forceResize, 300);
});

