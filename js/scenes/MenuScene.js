/**
 * MenuScene - Main menu with start button, difficulty selection, and sound toggle
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor("#0b0f14");
    
    // Add decorative background elements
    this.createBackgroundDecorations();

    // Title (side by side for landscape)
    this.add.text(width / 2 - 10, height * 0.18, "FRUIT", {
      fontFamily: "Arial Black",
      fontSize: "64px",
      color: "#ff4d6d"
    }).setOrigin(1, 0.5);

    this.add.text(width / 2 + 10, height * 0.18, "SLICE", {
      fontFamily: "Arial Black",
      fontSize: "64px",
      color: "#4cc9f0"
    }).setOrigin(0, 0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.32, "Swipe to slice!", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#888888"
    }).setOrigin(0.5);

    // Best score display (updates when difficulty changes)
    this.bestScoreText = this.add.text(width / 2, height * 0.44, "", {
      fontFamily: "Arial Black",
      fontSize: "22px",
      color: "#ffc300"
    }).setOrigin(0.5);
    
    this.updateBestScoreDisplay();

    // Difficulty selection
    this.createDifficultySelector(width / 2, height * 0.58);

    // Start button
    this.createButton(width / 2, height * 0.78, "START GAME", 280, 65, 0xf72585, () => {
      this.startGame();
    });

    // Sound toggle
    this.createSoundToggle(width - 50, 50);

    // Animate entrance
    this.animateEntrance();

    // Handle resize
    this.scale.on("resize", this.handleResize, this);
  }

  createBackgroundDecorations() {
    const { width, height } = this.scale;
    
    // Add some floating fruit silhouettes in background
    const colors = [0xff4d6d, 0x52b788, 0xffc300, 0x9d4edd];
    
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const color = Phaser.Utils.Array.GetRandom(colors);
      
      const circle = this.add.circle(x, y, Phaser.Math.Between(15, 35), color, 0.08);
      
      // Gentle floating animation
      this.tweens.add({
        targets: circle,
        y: y + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  createDifficultySelector(x, y) {
    const difficulties = ["easy", "normal", "hard"];
    const labels = ["EASY", "NORMAL", "HARD"];
    const colors = [0x52b788, 0x4361ee, 0xf72585];
    
    this.difficultyButtons = [];
    const currentDifficulty = this.registry.get("difficulty") || "normal";
    
    // Label
    this.add.text(x, y - 45, "Difficulty", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#666666"
    }).setOrigin(0.5);

    const spacing = 140;  // Wider spacing for landscape
    const startX = x - spacing;

    for (let i = 0; i < difficulties.length; i++) {
      const btnX = startX + (i * spacing);
      const isSelected = difficulties[i] === currentDifficulty;
      
      const container = this.add.container(btnX, y);
      
      const bg = this.add.rectangle(0, 0, 95, 45, colors[i], isSelected ? 1 : 0.3);
      bg.setStrokeStyle(2, colors[i], 1);
      
      const txt = this.add.text(0, 0, labels[i], {
        fontFamily: "Arial Black",
        fontSize: "14px",
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
    
    // Update button visuals
    this.difficultyButtons.forEach((btn, i) => {
      const isSelected = i === index;
      btn.isSelected = isSelected;
      btn.bg.setFillStyle(btn.color, isSelected ? 1 : 0.3);
      btn.setScale(isSelected ? 1.1 : 1.0);
    });

    // Update best score display for selected difficulty
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
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, w, h, color, 1);
    bg.setStrokeStyle(3, 0xffffff, 0.25);
    
    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: "26px",
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
    const soundEnabled = this.registry.get("soundEnabled");
    
    this.soundBtn = this.add.container(x, y);
    
    const bg = this.add.circle(0, 0, 28, soundEnabled ? 0x52b788 : 0x444444);
    
    // Simple speaker icon using text
    this.soundIcon = this.add.text(0, 0, soundEnabled ? "🔊" : "🔇", {
      fontSize: "24px"
    }).setOrigin(0.5);
    
    this.soundBtn.add([bg, this.soundIcon]);
    this.soundBtn.bg = bg;
    
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => this.soundBtn.setScale(1.1));
    bg.on("pointerout", () => this.soundBtn.setScale(1.0));
    bg.on("pointerdown", () => {
      const newState = !this.registry.get("soundEnabled");
      this.registry.set("soundEnabled", newState);
      StorageManager.setSoundEnabled(newState); // Persist to localStorage
      this.soundIcon.setText(newState ? "🔊" : "🔇");
      this.soundBtn.bg.setFillStyle(newState ? 0x52b788 : 0x444444);
    });
  }

  animateEntrance() {
    // Fade in the scene
    this.cameras.main.fadeIn(400, 11, 15, 20);
  }

  startGame() {
    // Enter fullscreen and lock to landscape on mobile
    this.enterFullscreenLandscape();
    
    this.cameras.main.fadeOut(300, 11, 15, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }

  enterFullscreenLandscape() {
    // Request fullscreen
    if (this.scale.isFullscreen) {
      return; // Already fullscreen
    }

    this.scale.startFullscreen();

    // Lock orientation to landscape on mobile
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {
        // Orientation lock not supported or denied - that's okay
      });
    }
  }

  handleResize() {
    // Could update positions here if needed
  }
}

