/**
 * MenuScene - Splash screen using real assets
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    const isPortrait = height > width;

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
      // Fallback Title
      const fontSize = Math.min(64, width * 0.1);
      this.add.text(width / 2, height * 0.35, "FRUIT SLICE", {
        fontFamily: "Arial Black",
        fontSize: `${fontSize}px`,
        color: "#ffffff"
      }).setOrigin(0.5);
    }

    // Start Button - responsive sizing
    const btnW = isPortrait ? width * 0.6 : Math.min(300, width * 0.25);
    const btnH = Math.max(50, Math.min(70, height * 0.1));
    const btnFontSize = Math.max(18, Math.min(28, height * 0.04));
    this.createStartButton(width / 2, height * 0.75, btnW, btnH, btnFontSize);

    // Best Score - responsive font
    const best = StorageManager.getBestScore("default");
    const scoreFontSize = Math.max(16, Math.min(24, height * 0.035));
    this.add.text(width / 2, height * 0.88, `Best Score: ${best}`, {
      fontFamily: "Arial",
      fontSize: `${scoreFontSize}px`,
      color: "#888888"
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
    
    // Green button with rounded corners
    const bg = this.add.graphics();
    bg.fillStyle(0x52b788, 1);
    const radius = Math.min(15, h * 0.2);
    bg.fillRoundedRect(-w/2, -h/2, w, h, radius);
    
    const txt = this.add.text(0, 0, "START GAME", {
      fontFamily: "Arial Black",
      fontSize: `${fontSize}px`,
      color: "#ffffff"
    }).setOrigin(0.5);
    
    container.add([txt]);
    container.addAt(bg, 0); // Put bg behind text

    const hitArea = new Phaser.Geom.Rectangle(-w/2, -h/2, w, h);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    container.on("pointerdown", () => container.setScale(0.95));
    container.on("pointerup", () => {
      container.setScale(1);
      this.startGame();
    });
  }

  startGame() {
    // Prevent double-click issues
    if (this.isStarting) return;
    this.isStarting = true;

    // Resume audio context
    if (this.sound.context?.state === 'suspended') {
      this.sound.context.resume();
    }

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
