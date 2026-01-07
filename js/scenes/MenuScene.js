/**
 * MenuScene - Main menu with start button, difficulty selection, and sound toggle
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    // Background
    this.cameras.main.setBackgroundColor("#0b0f14");
    
    // Add decorative background elements
    this.createBackgroundDecorations();

    // Title (side by side for landscape)
    this.titleFruit = this.add.text(width / 2 - s(10), height * 0.15, "FRUIT", {
      fontFamily: "Arial Black",
      fontSize: fs(52) + "px",
      color: "#ff4d6d"
    }).setOrigin(1, 0.5);

    this.titleSlice = this.add.text(width / 2 + s(10), height * 0.15, "SLICE", {
      fontFamily: "Arial Black",
      fontSize: fs(52) + "px",
      color: "#4cc9f0"
    }).setOrigin(0, 0.5);

    // Subtitle
    this.subtitle = this.add.text(width / 2, height * 0.28, "Swipe to slice!", {
      fontFamily: "Arial",
      fontSize: fs(18) + "px",
      color: "#888888"
    }).setOrigin(0.5);

    // Best score display
    this.bestScoreText = this.add.text(width / 2, height * 0.40, "", {
      fontFamily: "Arial Black",
      fontSize: fs(18) + "px",
      color: "#ffc300"
    }).setOrigin(0.5);
    
    this.updateBestScoreDisplay();

    // Difficulty selection
    this.createDifficultySelector(width / 2, height * 0.55);

    // Start button
    this.startBtn = this.createButton(
      width / 2, 
      height * 0.75, 
      "START GAME", 
      s(220), 
      s(50), 
      0xf72585, 
      () => this.startGame()
    );

    // Sound toggle
    this.createSoundToggle(width - s(40), s(40));

    // Animate entrance
    this.animateEntrance();

    // Handle resize
    this.scale.on("resize", this.handleResize, this);
  }

  createBackgroundDecorations() {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    
    const colors = [0xff4d6d, 0x52b788, 0xffc300, 0x9d4edd];
    this.bgCircles = [];
    
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(s(50), width - s(50));
      const y = Phaser.Math.Between(s(50), height - s(50));
      const color = Phaser.Utils.Array.GetRandom(colors);
      const radius = s(Phaser.Math.Between(12, 28));
      
      const circle = this.add.circle(x, y, radius, color, 0.08);
      this.bgCircles.push(circle);
      
      this.tweens.add({
        targets: circle,
        y: y + s(Phaser.Math.Between(-20, 20)),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  createDifficultySelector(x, y) {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    const difficulties = ["easy", "normal", "hard"];
    const labels = ["EASY", "NORMAL", "HARD"];
    const colors = [0x52b788, 0x4361ee, 0xf72585];
    
    this.difficultyButtons = [];
    const currentDifficulty = this.registry.get("difficulty") || "normal";
    
    // Label
    this.diffLabel = this.add.text(x, y - s(35), "Difficulty", {
      fontFamily: "Arial",
      fontSize: fs(16) + "px",
      color: "#666666"
    }).setOrigin(0.5);

    const spacing = s(110);
    const startX = x - spacing;

    for (let i = 0; i < difficulties.length; i++) {
      const btnX = startX + (i * spacing);
      const isSelected = difficulties[i] === currentDifficulty;
      
      const container = this.add.container(btnX, y);
      
      const bg = this.add.rectangle(0, 0, s(80), s(36), colors[i], isSelected ? 1 : 0.3);
      bg.setStrokeStyle(s(2), colors[i], 1);
      
      const txt = this.add.text(0, 0, labels[i], {
        fontFamily: "Arial Black",
        fontSize: fs(12) + "px",
        color: "#ffffff"
      }).setOrigin(0.5);
      
      container.add([bg, txt]);
      
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (!container.isSelected) container.setScale(1.05);
      });
      bg.on("pointerout", () => {
        if (!container.isSelected) container.setScale(1.0);
      });
      bg.on("pointerdown", () => {
        this.selectDifficulty(difficulties[i], i);
      });
      
      container.isSelected = isSelected;
      container.difficulty = difficulties[i];
      container.bg = bg;
      container.color = colors[i];
      
      this.difficultyButtons.push(container);
    }
  }

  selectDifficulty(difficulty, index) {
    this.registry.set("difficulty", difficulty);
    
    this.difficultyButtons.forEach((btn, i) => {
      const isSelected = i === index;
      btn.isSelected = isSelected;
      btn.bg.setFillStyle(btn.color, isSelected ? 1 : 0.3);
      btn.setScale(isSelected ? 1.1 : 1.0);
    });

    this.updateBestScoreDisplay();
  }

  updateBestScoreDisplay() {
    const difficulty = this.registry.get("difficulty") || "normal";
    const bestScore = StorageManager.getBestScore(difficulty);
    const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    
    if (bestScore > 0) {
      this.bestScoreText.setText(`Best (${diffLabel}): ${bestScore}`);
    } else {
      this.bestScoreText.setText(`Best (${diffLabel}): ---`);
    }
  }

  createButton(x, y, label, w, h, color, onClick) {
    const { width, height } = this.scale;
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, w, h, color, 1);
    bg.setStrokeStyle(2, 0xffffff, 0.25);
    
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: fs(20) + "px",
      color: "#ffffff"
    }).setOrigin(0.5);
    
    container.add([bg, txt]);
    
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => container.setScale(1.05));
    bg.on("pointerout", () => container.setScale(1.0));
    bg.on("pointerdown", () => container.setScale(0.95));
    bg.on("pointerup", () => {
      container.setScale(1.05);
      onClick();
    });
    
    return container;
  }

  createSoundToggle(x, y) {
    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const fs = (v) => ScaleManager.fontSize(v, width, height);

    const soundEnabled = this.registry.get("soundEnabled");
    
    this.soundBtn = this.add.container(x, y);
    
    const bg = this.add.circle(0, 0, s(22), soundEnabled ? 0x52b788 : 0x444444);
    
    this.soundIcon = this.add.text(0, 0, soundEnabled ? "🔊" : "🔇", {
      fontSize: fs(18) + "px"
    }).setOrigin(0.5);
    
    this.soundBtn.add([bg, this.soundIcon]);
    this.soundBtn.bg = bg;
    
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => this.soundBtn.setScale(1.1));
    bg.on("pointerout", () => this.soundBtn.setScale(1.0));
    bg.on("pointerdown", () => {
      const newState = !this.registry.get("soundEnabled");
      this.registry.set("soundEnabled", newState);
      StorageManager.setSoundEnabled(newState);
      this.soundIcon.setText(newState ? "🔊" : "🔇");
      this.soundBtn.bg.setFillStyle(newState ? 0x52b788 : 0x444444);
    });
  }

  animateEntrance() {
    this.cameras.main.fadeIn(400, 11, 15, 20);
  }

  startGame() {
    this.enterFullscreenLandscape();
    
    this.cameras.main.fadeOut(300, 11, 15, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }

  enterFullscreenLandscape() {
    if (this.scale.isFullscreen) return;

    this.scale.startFullscreen();

    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    
    if (this.lastWidth && (Math.abs(this.lastWidth - width) > 50 || Math.abs(this.lastHeight - height) > 50)) {
      this.scene.restart();
    }
    this.lastWidth = width;
    this.lastHeight = height;
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
  }
}
