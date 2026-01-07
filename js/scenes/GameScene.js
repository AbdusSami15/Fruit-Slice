/**
 * GameScene - Main gameplay: spawning, physics, slicing mechanics
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init() {
    // Gameplay state
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;

    // Initialize difficulty manager
    const difficultyMode = this.registry.get("difficulty") || "normal";
    this.difficulty = new DifficultyManager(difficultyMode);
    this.lives = this.difficulty.getStartingLives();

    // Spawning
    this.spawnTimer = null;

    // Input trail
    this.trailPoints = [];
    this.maxTrailPoints = 14;
    this.minSliceSpeed = 900; // px/sec threshold for slice

    // Slice detection optimization
    this.maxFruitsToCheck = 12;      // Only check N most recent fruits
    this.sliceCooldownMs = 100;      // Cooldown before same fruit can be sliced again
    this.fruitRadiusMargin = 40;     // Bounding box expansion for segment check

    // Fruit types with scores and spawn weights
    this.fruitTypes = [
      { type: "red",    score: 10, weight: 25, color: 0xff4d6d },  // Apple
      { type: "green",  score: 10, weight: 25, color: 0x52b788 },  // Lime
      { type: "yellow", score: 15, weight: 20, color: 0xffc300 },  // Lemon
      { type: "purple", score: 15, weight: 15, color: 0x9d4edd },  // Grape
      { type: "orange", score: 20, weight: 10, color: 0xff8c42 },  // Orange
      { type: "pink",   score: 25, weight: 5,  color: 0xff69b4 },  // Dragonfruit (rare)
    ];

    // Combo system
    this.comboCount = 0;           // Fruits sliced in current swipe
    this.comboTimeout = null;      // Timer to finalize combo
    this.comboWindowMs = 150;      // Time window to chain slices
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor("#0b0f14");

    // Physics world
    this.physics.world.setBounds(0, 0, width, height);

    // Groups
    this.fruits = this.physics.add.group();
    this.juice = this.add.particles(0, 0, "juiceDot");

    // Swipe trail graphics
    this.trailGfx = this.add.graphics();
    this.trailGfx.setDepth(1000);

    // Audio setup
    this.audioLoaded = this.registry.get("audioLoaded") || {};

    // Input handlers
    this.setupInput();

    // Start spawning (difficulty scales automatically via DifficultyManager)
    this.startSpawning();

    // Resize support
    this.scale.on("resize", this.handleResize, this);

    // Listen for events from UIScene
    this.events.on("pause-game", this.pauseGame, this);
    this.events.on("resume-game", this.resumeGame, this);

    // Fade in
    this.cameras.main.fadeIn(300, 11, 15, 20);

    // Emit initial state to UI
    this.emitGameState();
  }

  // Play sound effect if enabled and loaded
  playSfx(key, config = {}) {
    if (!this.registry.get("soundEnabled")) return;
    if (!this.audioLoaded[key]) return;
    
    this.sound.play(`sfx_${key}`, {
      volume: config.volume || 0.5,
      rate: config.rate || 1,
      detune: config.detune || 0
    });
  }

  setupInput() {
    this.input.on("pointerdown", (p) => {
      if (this.isGameOver || this.isPaused) return;
      this.trailPoints.length = 0;
      this.pushTrailPoint(p.x, p.y, p.time);
      // Reset combo for new swipe
      this.comboCount = 0;
      if (this.comboTimeout) this.comboTimeout.remove(false);
    });

    this.input.on("pointermove", (p) => {
      if (this.isGameOver || this.isPaused) return;
      if (!p.isDown) return;

      this.pushTrailPoint(p.x, p.y, p.time);
      this.renderTrail();

      // Try slice on latest segment
      if (this.trailPoints.length >= 2) {
        const a = this.trailPoints[this.trailPoints.length - 2];
        const b = this.trailPoints[this.trailPoints.length - 1];

        const dt = Math.max(1, (b.t - a.t));
        const speed = (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / dt) * 1000;

        if (speed >= this.minSliceSpeed) {
          this.trySliceSegment(a.x, a.y, b.x, b.y);
        }
      }
    });

    this.input.on("pointerup", () => {
      this.time.delayedCall(80, () => {
        this.trailPoints.length = 0;
        this.renderTrail();
      });
    });
  }

  handleResize() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    // Update difficulty progression
    this.difficulty.update(delta);

    const { height } = this.scale;

    // Check for missed fruits
    const children = this.fruits.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const fruit = children[i];
      if (!fruit.active) continue;

      if (!fruit.sliced && fruit.y > height + 80) {
        this.missFruit(fruit);
      }
    }
  }

  // ----------------------------
  // Spawning
  // ----------------------------
  startSpawning() {
    if (this.spawnTimer) this.spawnTimer.remove(false);

    const spawnOnce = () => {
      if (this.isGameOver || this.isPaused) return;

      // Check max simultaneous fruits cap
      const activeFruits = this.fruits.getChildren().filter(f => f.active && !f.sliced).length;
      const maxFruits = this.difficulty.getMaxSimultaneousFruits();

      if (activeFruits < maxFruits) {
        this.spawnFruit();
      }

      // Get current spawn interval from difficulty curve
      const interval = this.difficulty.getSpawnInterval();
      const delay = Phaser.Math.Between(interval.min, interval.max);
      this.spawnTimer = this.time.delayedCall(delay, spawnOnce);
    };

    this.spawnTimer = this.time.delayedCall(400, spawnOnce);
  }

  spawnFruit() {
    const { width, height } = this.scale;

    // Get current difficulty parameters (scaled to screen size)
    const bombChance = this.difficulty.getBombChance();
    const velocity = this.difficulty.getLaunchVelocity(height, width);
    const gravity = this.difficulty.getGravity(height);

    // Decide if spawning bomb or fruit
    const isBomb = Math.random() < bombChance;

    const x = Phaser.Math.Between(60, width - 60);
    const y = height + 70;

    let fruit;
    if (isBomb) {
      fruit = this.fruits.create(x, y, "bomb");
      fruit.type = "bomb";
      fruit.isBomb = true;
      fruit.fruitScore = 0;
      fruit.fruitColor = 0xff0000;
    } else {
      // Weighted random fruit selection
      const fruitData = this.getWeightedRandomFruit();
      fruit = this.fruits.create(x, y, `fruit_${fruitData.type}`);
      fruit.type = fruitData.type;
      fruit.isBomb = false;
      fruit.fruitScore = fruitData.score;
      fruit.fruitColor = fruitData.color;
    }

    // Scale fruit based on screen size
    const fruitScale = ScaleManager.getFruitScale(width, height);
    const baseVariation = Phaser.Math.FloatBetween(0.9, 1.1);
    const finalScale = fruitScale * baseVariation;

    fruit.setDepth(10);
    fruit.setCircle(26);
    fruit.setBounce(0.2);
    fruit.setCollideWorldBounds(false);
    fruit.sliced = false;
    fruit.sliceCooldownUntil = 0;
    fruit.baseRadius = 28 * finalScale; // Store for collision detection

    // Launch upward with velocity from difficulty curve
    const vx = Phaser.Math.Between(velocity.vxMin, velocity.vxMax);
    const vy = Phaser.Math.Between(velocity.vyMin, velocity.vyMax);

    fruit.body.setVelocity(vx, vy);
    fruit.body.setGravityY(gravity);
    fruit.body.setAngularVelocity(Phaser.Math.Between(-220, 220));

    fruit.setScale(finalScale);
  }

  getWeightedRandomFruit() {
    const totalWeight = this.fruitTypes.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const fruitData of this.fruitTypes) {
      random -= fruitData.weight;
      if (random <= 0) return fruitData;
    }
    return this.fruitTypes[0]; // Fallback
  }

  // ----------------------------
  // Trail + slicing
  // ----------------------------
  pushTrailPoint(x, y, t) {
    this.trailPoints.push({ x, y, t });
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.shift();
    }
  }

  renderTrail() {
    this.trailGfx.clear();

    if (this.trailPoints.length < 2) return;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p0 = this.trailPoints[i - 1];
      const p1 = this.trailPoints[i];

      const alpha = i / this.trailPoints.length;
      const thickness = 2 + alpha * 8;

      this.trailGfx.lineStyle(thickness, 0xffffff, 0.12 + alpha * 0.65);
      this.trailGfx.beginPath();
      this.trailGfx.moveTo(p0.x, p0.y);
      this.trailGfx.lineTo(p1.x, p1.y);
      this.trailGfx.strokePath();
    }
  }

  trySliceSegment(x1, y1, x2, y2) {
    const now = this.time.now;
    const fruits = this.fruits.getChildren();
    const count = fruits.length;

    // Calculate segment bounding box with margin
    const margin = this.fruitRadiusMargin;
    const minX = Math.min(x1, x2) - margin;
    const maxX = Math.max(x1, x2) + margin;
    const minY = Math.min(y1, y2) - margin;
    const maxY = Math.max(y1, y2) + margin;

    // Only check last N fruits (most recently spawned)
    const startIdx = Math.max(0, count - this.maxFruitsToCheck);

    for (let i = startIdx; i < count; i++) {
      const fruit = fruits[i];

      // Skip inactive or already sliced
      if (!fruit.active || fruit.sliced) continue;

      // Skip if in cooldown (prevents double-slice from rapid input)
      if (fruit.sliceCooldownUntil && now < fruit.sliceCooldownUntil) continue;

      // Fast bounding box rejection
      if (fruit.x < minX || fruit.x > maxX || fruit.y < minY || fruit.y > maxY) continue;

      // Precise segment-circle check
      const r = fruit.baseRadius || (28 * fruit.scaleX);
      if (this.segmentIntersectsCircle(x1, y1, x2, y2, fruit.x, fruit.y, r)) {
        this.sliceFruit(fruit, x1, y1, x2, y2);
      } else {
        // Set cooldown to avoid re-checking this fruit too soon
        fruit.sliceCooldownUntil = now + this.sliceCooldownMs;
      }
    }
  }

  segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const len2 = dx * dx + dy * dy;
    if (len2 <= 0.0001) return false;

    let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
    t = Phaser.Math.Clamp(t, 0, 1);

    const px = x1 + t * dx;
    const py = y1 + t * dy;

    const dist2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    return dist2 <= r * r;
  }

  sliceFruit(fruit, x1, y1, x2, y2) {
    fruit.sliced = true;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    // Handle bomb slice - lose a life!
    if (fruit.isBomb) {
      this.sliceBomb(fruit, angle);
      return;
    }

    // Play slice sound with slight pitch variation
    this.playSfx("slice", { 
      volume: 0.6, 
      detune: Phaser.Math.Between(-100, 100) 
    });

    // Increment combo
    this.comboCount++;
    this.scheduleComboFinalize();

    // Calculate score with combo multiplier
    const baseScore = fruit.fruitScore;
    const comboMultiplier = this.comboCount > 1 ? this.comboCount : 1;
    const earnedScore = baseScore * comboMultiplier;
    
    this.score += earnedScore;
    this.emitGameState();

    // Show floating score at fruit position
    this.showFloatingScore(fruit.x, fruit.y, earnedScore, this.comboCount);

    // Juice particles
    this.juice.createEmitter({
      x: fruit.x,
      y: fruit.y,
      lifespan: 500,
      speed: { min: 120, max: 420 },
      angle: { min: Phaser.Math.RadToDeg(angle) - 60, max: Phaser.Math.RadToDeg(angle) + 60 },
      scale: { start: 0.45, end: 0 },
      quantity: 10,
      frequency: -1,
      tint: fruit.fruitColor,
      blendMode: "ADD"
    }).explode(18, fruit.x, fruit.y);

    // Spawn halves
    this.spawnHalves(fruit);

    // Pop animation
    this.tweens.add({
      targets: fruit,
      scale: fruit.scaleX * 1.15,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        fruit.destroy();
      }
    });
  }

  sliceBomb(bomb, angle) {
    // Play bomb explosion sound
    this.playSfx("bomb", { volume: 0.8 });

    // Explosion particles (red/orange)
    this.juice.createEmitter({
      x: bomb.x,
      y: bomb.y,
      lifespan: 600,
      speed: { min: 200, max: 500 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      quantity: 25,
      frequency: -1,
      tint: [0xff0000, 0xff6600, 0xffaa00],
      blendMode: "ADD"
    }).explode(30, bomb.x, bomb.y);

    // Screen shake
    this.cameras.main.shake(200, 0.015);

    // Flash red
    this.cameras.main.flash(150, 255, 0, 0, false);

    // Lose a life
    this.lives -= 1;
    this.emitGameState();

    // Show penalty text
    this.showFloatingScore(bomb.x, bomb.y, -1, 0, true);

    // Destroy bomb
    this.tweens.add({
      targets: bomb,
      scale: bomb.scaleX * 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        bomb.destroy();
      }
    });

    // Check game over
    if (this.lives <= 0) {
      this.time.delayedCall(300, () => this.gameOver());
    }
  }

  scheduleComboFinalize() {
    // Reset combo timer
    if (this.comboTimeout) this.comboTimeout.remove(false);
    
    this.comboTimeout = this.time.delayedCall(this.comboWindowMs, () => {
      // Emit combo result to UI if it was a combo
      if (this.comboCount >= 3) {
        this.events.emit("show-combo", this.comboCount);
        // Play combo sound with higher pitch for bigger combos
        this.playSfx("combo", { 
          volume: 0.7, 
          detune: Math.min(this.comboCount * 50, 300) 
        });
      }
      this.comboCount = 0;
    });
  }

  showFloatingScore(x, y, score, combo, isBomb = false) {
    const { width, height } = this.scale;
    const fs = (v) => ScaleManager.fontSize(v, width, height);
    const s = (v) => ScaleManager.scale(v, width, height);

    let text, color;
    
    if (isBomb) {
      text = "BOMB! -1 ❤️";
      color = "#ff0000";
    } else if (combo >= 3) {
      text = `+${score} x${combo} COMBO!`;
      color = "#ffc300";
    } else if (combo === 2) {
      text = `+${score} x2`;
      color = "#4cc9f0";
    } else {
      text = `+${score}`;
      color = "#ffffff";
    }

    const floatText = this.add.text(x, y - s(16), text, {
      fontFamily: "Arial Black",
      fontSize: (combo >= 3 ? fs(24) : fs(18)) + "px",
      color: color,
      stroke: "#000000",
      strokeThickness: s(3)
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: floatText,
      y: y - s(60),
      alpha: 0,
      scale: combo >= 3 ? 1.3 : 1.1,
      duration: 800,
      ease: "Cubic.easeOut",
      onComplete: () => floatText.destroy()
    });
  }

  spawnHalves(fruit) {
    // Don't spawn halves for bombs
    if (fruit.isBomb) return;

    const { width, height } = this.scale;
    const s = (v) => ScaleManager.scale(v, width, height);
    const gravity = this.difficulty.getGravity(height);

    const type = fruit.type;
    const aKey = `half_${type}_a`;
    const bKey = `half_${type}_b`;

    const offset = s(10);
    const left = this.physics.add.sprite(fruit.x - offset, fruit.y, aKey);
    const right = this.physics.add.sprite(fruit.x + offset, fruit.y, bKey);

    left.setScale(fruit.scaleX);
    right.setScale(fruit.scaleX);

    left.body.setGravityY(gravity);
    right.body.setGravityY(gravity);

    const splitVx = s(140);
    const splitVy = s(70);
    left.body.setVelocity(fruit.body.velocity.x - splitVx, fruit.body.velocity.y - splitVy);
    right.body.setVelocity(fruit.body.velocity.x + splitVx, fruit.body.velocity.y - splitVy);

    left.body.setAngularVelocity(Phaser.Math.Between(-260, -120));
    right.body.setAngularVelocity(Phaser.Math.Between(120, 260));

    left.setDepth(9);
    right.setDepth(9);

    // Auto cleanup
    this.time.delayedCall(2200, () => {
      if (left.active) left.destroy();
      if (right.active) right.destroy();
    });
  }

  // ----------------------------
  // Miss / Pause / Game Over
  // ----------------------------
  missFruit(fruit) {
    // Bombs that fall off screen are fine - no penalty!
    if (fruit.isBomb) {
      fruit.destroy();
      return;
    }

    // Play miss sound
    this.playSfx("miss", { volume: 0.5 });

    fruit.destroy();
    this.lives -= 1;
    this.emitGameState();

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  pauseGame() {
    this.isPaused = true;
    
    // Pause physics
    this.physics.pause();
    
    // Pause spawn timer
    if (this.spawnTimer) this.spawnTimer.paused = true;
    
    // Pause all active tweens in this scene
    this.tweens.pauseAll();
    
    // Pause time events (delayed calls)
    this.time.paused = true;
  }

  resumeGame() {
    this.isPaused = false;
    
    // Resume physics
    this.physics.resume();
    
    // Resume spawn timer
    if (this.spawnTimer) this.spawnTimer.paused = false;
    
    // Resume all tweens
    this.tweens.resumeAll();
    
    // Resume time events
    this.time.paused = false;
  }

  emitGameState() {
    // Send state to UIScene
    this.events.emit("update-score", this.score);
    this.events.emit("update-lives", this.lives);
  }

  gameOver() {
    this.isGameOver = true;

    // Play game over sound
    this.playSfx("gameover", { volume: 0.7 });

    if (this.spawnTimer) this.spawnTimer.remove(false);

    // Clear trail
    this.trailPoints.length = 0;
    this.renderTrail();

    // Check if new best score for this difficulty
    const difficulty = this.difficulty.mode;
    const isNewBest = StorageManager.updateBestScore(difficulty, this.score);
    
    // Update registry with new best scores
    this.registry.set("bestScores", StorageManager.getAllBestScores());

    // Stop UI scene and start game over
    this.scene.stop("UIScene");
    this.scene.launch("GameOverScene", { 
      score: this.score, 
      difficulty: difficulty,
      isNewBest: isNewBest
    });
  }

  shutdown() {
    // Cleanup
    this.scale.off("resize", this.handleResize, this);
    this.events.off("pause-game", this.pauseGame, this);
    this.events.off("resume-game", this.resumeGame, this);
  }
}

