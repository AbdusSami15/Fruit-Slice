/**
 * Phaser Game Configuration
 * Entry point - creates the game instance with all scenes
 */

function getDpr() {
  // Keep rendering crisp on high-DPI screens; clamp to avoid extreme GPU memory use
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.min(dpr, 2));
}

const gameConfig = {
  type: Phaser.WEBGL,  // Force WebGL for better performance and quality
  parent: "game",
  backgroundColor: "#0b0f14",
  // HD rendering - account for device pixel ratio
  resolution: getDpr(),
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: "game"
  },
  // HD rendering settings for crisp, smooth images
  render: {
    antialias: true,
    antialiasGL: true,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxTextures: 16
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
    // Ensure renderer DPI matches current device DPR (can change on zoom/orientation/fullscreen)
    const dpr = getDpr();
    if (game.renderer && game.renderer.resolution !== dpr) {
      game.renderer.resolution = dpr;
    }
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

