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

    // Splash Logo
    if (this.textures.exists("logo")) {
      const logo = this.add.image(width / 2, height * 0.4, "logo");
      const targetWidth = isPortrait ? width * 0.8 : width * 0.4;
      logo.setScale(targetWidth / logo.width);
    } else {
      // Fallback Title
      this.add.text(width / 2, height * 0.35, "FRUIT SLICE", {
        fontFamily: "Arial Black",
        fontSize: "64px",
        color: "#ffffff"
      }).setOrigin(0.5);
    }

    // Start Button
    const btnW = isPortrait ? width * 0.6 : 300;
    this.createStartButton(width / 2, height * 0.75, btnW, 70);

    // Best Score
    const best = StorageManager.getBestScore("default");
    this.add.text(width / 2, height * 0.85, `Best Score: ${best}`, {
      fontFamily: "Arial",
      fontSize: "24px",
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

  createStartButton(x, y, w, h) {
    const container = this.add.container(x, y);
    
    // Green button
    const bg = this.add.graphics();
    bg.fillStyle(0x52b788, 1);
    bg.fillRoundedRect(-w/2, -h/2, w, h, 15);
    
    const txt = this.add.text(0, 0, "START GAME", {
      fontFamily: "Arial Black",
      fontSize: "28px",
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
    // Always go fullscreen
    if (!this.scale.isFullscreen) {
      this.scale.startFullscreen();
    }
    
    // Lock to landscape on mobile
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    // Resume audio context
    if (this.sound.context?.state === 'suspended') {
      this.sound.context.resume();
    }

    this.cameras.main.fadeOut(300);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }
}
