/**
 * BootScene - Preloads assets with fallback to procedural textures
 * Asset structure:
 *   assets/images/fruits/*.png (fruit_red, fruit_green, etc.)
 *   assets/images/ui/*.png (btn_primary, etc.)
 *   assets/audio/*.wav (slice, miss, gameover, bomb, combo)
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
    
    // Track which assets loaded successfully
    this.loadedImages = new Set();
    this.loadedAudio = new Set();
  }

  preload() {
    const { width, height } = this.scale;
    
    // Loading UI
    this.loadingText = this.add.text(width / 2, height / 2, "Loading...", {
      fontFamily: "Arial Black",
      fontSize: "32px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // Progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 + 30, 320, 30);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x4cc9f0, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 + 35, 310 * value, 20);
    });

    // Track successful loads
    this.load.on("filecomplete", (key, type) => {
      if (type === "image") {
        this.loadedImages.add(key);
      } else if (type === "audio") {
        this.loadedAudio.add(key);
      }
    });

    // Suppress errors for missing files (we have fallbacks)
    this.load.on("loaderror", (file) => {
      console.log(`Asset not found (using fallback): ${file.key}`);
    });

    // --- Load fruit images ---
    const fruitTypes = ["red", "green", "yellow", "purple", "orange", "pink"];
    fruitTypes.forEach(type => {
      this.load.image(`fruit_${type}`, `assets/images/fruits/fruit_${type}.png`);
      this.load.image(`half_${type}_a`, `assets/images/fruits/half_${type}_a.png`);
      this.load.image(`half_${type}_b`, `assets/images/fruits/half_${type}_b.png`);
    });
    
    // Bomb
    this.load.image("bomb", "assets/images/fruits/bomb.png");

    // --- Load UI images ---
    this.load.image("btn_primary", "assets/images/ui/btn_primary.png");
    this.load.image("btn_secondary", "assets/images/ui/btn_secondary.png");
    this.load.image("btn_small", "assets/images/ui/btn_small.png");
    this.load.image("juiceDot", "assets/images/ui/juiceDot.png");

    // --- Load audio ---
    this.load.audio("sfx_slice", "assets/audio/slice.wav");
    this.load.audio("sfx_miss", "assets/audio/miss.wav");
    this.load.audio("sfx_gameover", "assets/audio/gameover.wav");
    this.load.audio("sfx_bomb", "assets/audio/bomb.wav");
    this.load.audio("sfx_combo", "assets/audio/combo.wav");
  }

  create() {
    // Generate fallback textures for any missing images
    this.createFallbackTextures();
    
    // Load persisted settings from localStorage
    const savedData = StorageManager.load();
    
    // Initialize game settings in registry
    this.registry.set("difficulty", "normal");
    this.registry.set("soundEnabled", savedData.soundEnabled);
    this.registry.set("bestScores", savedData.bestScores);
    
    // Store audio availability in registry
    this.registry.set("audioLoaded", {
      slice: this.loadedAudio.has("sfx_slice"),
      miss: this.loadedAudio.has("sfx_miss"),
      gameover: this.loadedAudio.has("sfx_gameover"),
      bomb: this.loadedAudio.has("sfx_bomb"),
      combo: this.loadedAudio.has("sfx_combo")
    });
    
    // Transition to menu
    this.scene.start("MenuScene");
  }

  createFallbackTextures() {
    // Helper: create circle texture
    const makeCircle = (key, color) => {
      if (this.loadedImages.has(key)) return; // Already loaded from file
      
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(32, 32, 28);
      g.lineStyle(4, 0x000000, 0.15);
      g.strokeCircle(32, 32, 28);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    // Helper: create half-circle texture
    const makeHalf = (key, color, flip) => {
      if (this.loadedImages.has(key)) return;
      
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.beginPath();
      if (!flip) {
        g.arc(32, 32, 28, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(250), false);
      } else {
        g.arc(32, 32, 28, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(4, 0x000000, 0.15);
      g.strokeCircle(32, 32, 28);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    // Fruit colors for fallbacks
    const fruitColors = {
      red: 0xff4d6d,
      green: 0x52b788,
      yellow: 0xffc300,
      purple: 0x9d4edd,
      orange: 0xff8c42,
      pink: 0xff69b4
    };

    // Generate fallback fruit textures
    Object.entries(fruitColors).forEach(([type, color]) => {
      makeCircle(`fruit_${type}`, color);
      makeHalf(`half_${type}_a`, color, false);
      makeHalf(`half_${type}_b`, color, true);
    });

    // Bomb fallback
    if (!this.loadedImages.has("bomb")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x1a1a2e, 1);
      g.fillCircle(32, 32, 28);
      g.lineStyle(4, 0xff0000, 0.8);
      g.strokeCircle(32, 32, 28);
      g.fillStyle(0xff6600, 1);
      g.fillCircle(32, 8, 6);
      g.generateTexture("bomb", 64, 64);
      g.destroy();
    }

    // Juice particle fallback
    if (!this.loadedImages.has("juiceDot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("juiceDot", 8, 8);
      g.destroy();
    }

    // Button fallbacks
    const makeRoundedRect = (key, color, w, h, radius) => {
      if (this.loadedImages.has(key)) return;
      
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, h, radius);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    makeRoundedRect("btn_primary", 0xf72585, 280, 70, 12);
    makeRoundedRect("btn_secondary", 0x4361ee, 200, 55, 10);
    makeRoundedRect("btn_small", 0x3a0ca3, 60, 60, 8);
  }
}
