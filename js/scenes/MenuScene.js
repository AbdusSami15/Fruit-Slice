/**
 * MenuScene - Splash screen using real assets
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  init() {
    // Reset start latch whenever we enter the menu (scene instances are reused)
    this.isStarting = false;
  }

  create() {
    const { width, height } = this.scale;
    const isPortrait = height > width;

    // Try to start background music on first user interaction (autoplay-safe)
    this.input.once("pointerdown", () => {
      const bgm = this.sound.get("bgm");
      if (bgm && !bgm.isPlaying) bgm.play();
    });

    // Background
    this.cameras.main.setBackgroundColor("#0b0f14");

    // Display Background if it exists
    if (this.textures.exists("background")) {
      const bg = this.add.image(width / 2, height / 2, "background");
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale).setAlpha(0.5);
    }

    // Splash Logo - adjustable to fit screen
    if (this.textures.exists("logo")) {
      const logo = this.add.image(width / 2, height * 0.4, "logo");
      
      // Calculate scale to fit within bounds
      const maxWidth = isPortrait ? width * 0.85 : width * 0.45;
      const maxHeight = height * 0.45; // Never exceed 45% of screen height
      
      const scaleByWidth = maxWidth / logo.width;
      const scaleByHeight = maxHeight / logo.height;
      
      // Use the smaller scale to ensure it fits both constraints
      const finalScale = Math.min(scaleByWidth, scaleByHeight);
      logo.setScale(finalScale);
    } else {
      // Fallback Title - colorful gradient look
      const fontSize = Math.min(64, width * 0.1);
      this.add.text(width / 2, height * 0.35, "🍉 FRUIT SLICE 🍎", {
        fontFamily: "Arial Black",
        fontSize: `${fontSize}px`,
        color: "#ffc300",
        stroke: "#ff6600",
        strokeThickness: 6,
        shadow: { offsetX: 4, offsetY: 4, color: "#000", blur: 10, fill: true }
      }).setOrigin(0.5);
    }

    // Start Button - responsive sizing
    const btnW = isPortrait ? width * 0.6 : Math.min(300, width * 0.25);
    const btnH = Math.max(55, Math.min(75, height * 0.12));
    const btnFontSize = Math.max(20, Math.min(30, height * 0.045));
    this.createStartButton(width / 2, height * 0.72, btnW, btnH, btnFontSize);

    // Best Score - colorful
    const best = StorageManager.getBestScore("default");
    const scoreFontSize = Math.max(18, Math.min(26, height * 0.04));
    this.add.text(width / 2, height * 0.85, `🏆 Best Score: ${best}`, {
      fontFamily: "Arial Black",
      fontSize: `${scoreFontSize}px`,
      color: "#ffc300",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5);

    // Proper resize handling
    const resizeHandler = (gameSize) => {
      if (this.scene.isActive()) this.scene.restart();
    };
    this.scale.on("resize", resizeHandler);
    this.events.once("shutdown", () => {
      this.scale.off("resize", resizeHandler);
    });
  }

  createStartButton(x, y, w, h, fontSize = 28) {
    const container = this.add.container(x, y);
    const radius = Math.min(18, h * 0.25);
    
    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-w/2 + 4, -h/2 + 4, w, h, radius);
    
    // Main button - vibrant green gradient look
    const bg = this.add.graphics();
    bg.fillStyle(0x10b981, 1);
    bg.fillRoundedRect(-w/2, -h/2, w, h, radius);
    bg.fillStyle(0x059669, 1);
    bg.fillRoundedRect(-w/2 + 4, -h/2 + h * 0.55, w - 8, h * 0.4, radius * 0.7);
    
    // Border glow
    bg.lineStyle(3, 0x34d399, 1);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, radius);
    
    const txt = this.add.text(0, 0, "▶ START GAME", {
      fontFamily: "Arial Black",
      fontSize: `${fontSize}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5);
    
    container.add([shadow, bg, txt]);

    const hitArea = new Phaser.Geom.Rectangle(-w/2, -h/2, w, h);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    container.on("pointerdown", () => container.setScale(0.95));
    container.on("pointerup", () => {
      container.setScale(1);
      this.startGame();
    });
    container.on("pointerout", () => container.setScale(1));
  }

  startGame() {
    // Prevent double-click issues
    if (this.isStarting) return;
    this.isStarting = true;

    // Resume audio context
    if (this.sound.context?.state === 'suspended') {
      this.sound.context.resume();
    }

    // Ensure background music is playing after audio is unlocked
    const bgm = this.sound.get("bgm");
    if (bgm && !bgm.isPlaying) bgm.play();

    // Go fullscreen first using document element for better support
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
      if (requestFS) {
        requestFS.call(elem).then(() => {
          // Force resize after fullscreen activates
          this.scale.resize(window.innerWidth, window.innerHeight);
        }).catch(() => {});
      }
    }
    
    // Lock to landscape on mobile
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    // Start game immediately
    this.scene.start("GameScene");
    this.scene.launch("UIScene");
  }
}
