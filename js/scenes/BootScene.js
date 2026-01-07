/**
 * BootScene - Preloads assets with fallback to procedural textures
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
    this.loadedImages = new Set();
    this.loadedAudio = new Set();
  }

  preload() {
    const { width, height } = this.scale;
    
    // Background for loading screen
    this.cameras.main.setBackgroundColor("#0b0f14");
    
    // Loading UI
    this.loadingText = this.add.text(width / 2, height / 2 - 20, "Loading...", {
      fontFamily: "Arial Black",
      fontSize: ScaleManager.fontSize(32, width, height) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // Progress bar
    const barW = Math.min(width * 0.7, 320);
    const barH = 30;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 + 30;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barW, barH);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x4cc9f0, 1);
      progressBar.fillRect(barX + 5, barY + 5, (barW - 10) * value, barH - 10);
    });

    // Track successful loads
    this.load.on("filecomplete", (key, type) => {
      if (type === "image") {
        this.loadedImages.add(key);
      } else if (type === "audio") {
        this.loadedAudio.add(key);
      }
    });

    // Suppress errors for missing files
    this.load.on("loaderror", (file) => {
      console.warn(`Asset failed to load: ${file.key}`);
    });

    // --- Load assets based on screenshot paths ---
    // Note: background.png is inside fruits folder in your screenshot
    this.load.image("background", "assets/images/fruits/background.png");

    // Fruits (using exact names from screenshot)
    this.load.image("fruit_apple", "assets/images/fruits/apple.png");
    this.load.image("fruit_watermelon", "assets/images/fruits/waterMelon.png"); // Capital M
    this.load.image("fruit_pear", "assets/images/fruits/pear.png");
    this.load.image("fruit_peach", "assets/images/fruits/peach.png");
    this.load.image("bomb", "assets/images/fruits/bomb.png");

    // Logo (using exact name and extension from screenshot)
    this.load.image("logo", "assets/images/fruits/logo (1).webp");

    // UI and Particles (keep as fallbacks if not in screenshot)
    this.load.image("juiceDot", "assets/images/ui/juiceDot.png");
    this.load.image("cross", "assets/images/ui/cross.png");

    // Audio - load from assets/audio folder
    this.load.audio("sfx_slice", "assets/audio/slice.wav");
    this.load.audio("sfx_whoosh", "assets/audio/whoosh.wav");
  }

  create() {
    try {
      this.createFallbackTextures();
      
      const savedData = StorageManager.load();
      
      // Force sound enabled
      StorageManager.setSoundEnabled(true);
      this.registry.set("soundEnabled", true);
      this.registry.set("bestScores", savedData.bestScores);
      
      this.registry.set("audioLoaded", {
        slice: this.loadedAudio.has("sfx_slice"),
        whoosh: this.loadedAudio.has("sfx_whoosh")
      });
      
      this.scene.start("MenuScene");
    } catch (err) {
      console.error("Critical error in BootScene:", err);
      // Try to start the game anyway
      this.scene.start("MenuScene");
    }
  }

  createFallbackTextures() {
    const makeCircle = (key, color) => {
      if (this.loadedImages.has(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(32, 32, 28);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    const makeHalf = (key, color, flip) => {
      if (this.loadedImages.has(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.beginPath();
      if (!flip) g.arc(32, 32, 28, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(250), false);
      else g.arc(32, 32, 28, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
      g.closePath();
      g.fillPath();
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    const fruitColors = { apple: 0xff4d6d, watermelon: 0x52b788, pear: 0xffc300, peach: 0xffa07a, red: 0xff4d6d, green: 0x52b788, yellow: 0xffc300, purple: 0x9d4edd, orange: 0xff8c42, pink: 0xff69b4 };
    Object.entries(fruitColors).forEach(([type, color]) => {
      makeCircle(`fruit_${type}`, color);
      makeHalf(`half_${type}_a`, color, false);
      makeHalf(`half_${type}_b`, color, true);
    });

    if (!this.loadedImages.has("bomb")) makeCircle("bomb", 0x333333);
    if (!this.loadedImages.has("juiceDot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("juiceDot", 8, 8);
      g.destroy();
    }
  }
}
