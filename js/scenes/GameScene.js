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
    this.lives = 3;
    this.isGameOver = false;
    this.isPaused = false;

    // Initialize difficulty manager (single mode, ramps over time)
    this.difficulty = new DifficultyManager();

    // Spawning
    this.spawnTimer = null;

    // Input trail - short trail that fades quickly
    this.trailPoints = [];
    this.maxTrailPoints = 8;         // Short trail
    this.trailMaxAge = 80;           // Points expire after 80ms
    this.minSliceSpeed = 100;        // Very low threshold - easy to slice

    // Slice detection optimization
    this.maxFruitsToCheck = 20;      // Check more fruits
    this.sliceCooldownMs = 30;       // Short cooldown
    this.fruitRadiusMargin = 60;     // Larger bounding box

    // Fruit types mapping to confirmed asset keys
    this.fruitTypes = [
      { name: "apple",      score: 10, color: 0xff4d6d },
      { name: "waterMelon", score: 15, color: 0x52b788 }, // Capital M from confirmed path
      { name: "pear",       score: 10, color: 0xffc300 },
      { name: "peach",      score: 12, color: 0xffa07a }  // Added Peach from folder
    ];

    // Combo system
    this.comboCount = 0;           // Fruits sliced in current swipe
    this.comboTimeout = null;      // Timer to finalize combo
    this.comboWindowMs = 150;      // Time window to chain slices
  }

  create() {
    const { width, height } = this.scale;

    // Background (using confirmed centered logic)
    if (this.textures.exists("background")) {
      const bg = this.add.image(width / 2, height / 2, "background");
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale).setAlpha(0.8);
    } else {
      this.cameras.main.setBackgroundColor("#0b0f14");
    }

    // Physics world
    this.physics.world.setBounds(0, 0, width, height);

    // Groups
    this.fruits = this.physics.add.group();
    
    // Audio status
    this.audioStatus = this.registry.get("audioLoaded") || {};

    // Particle system
    try {
      this.juice = this.add.particles("juiceDot");
    } catch (e) {
      console.warn("Failed to create particles", e);
    }

    // Swipe trail graphics
    this.trailGfx = this.add.graphics();
    this.trailGfx.setDepth(1000);

    // Input handlers
    this.setupInput();

    // Start spawning
    this.startSpawning();

    // Proper resize handling
    const resizeHandler = (gameSize) => {
      if (this.scene.isActive()) this.handleResize(gameSize);
    };
    this.scale.on("resize", resizeHandler);
    this.events.once("shutdown", () => {
      this.scale.off("resize", resizeHandler);
    });

    // Listen for events from UIScene
    this.events.on("pause-game", this.pauseGame, this);
    this.events.on("resume-game", this.resumeGame, this);

    // Fade in
    this.cameras.main.fadeIn(300);

    // Emit initial state to UI
    this.emitGameState();
  }

  playSfx(key, config = {}) {
    if (!this.registry.get("soundEnabled")) return;
    if (!this.audioStatus[key]) return;
    
    this.sound.play(`sfx_${key}`, {
      volume: config.volume || 0.5,
      rate: config.rate || 1,
      detune: config.detune || 0
    });
  }

  playWhoosh() {
    try {
      // Resume audio context if needed
      if (this.sound.context?.state === 'suspended') {
        this.sound.context.resume();
      }
      
      // Force play whoosh
      this.sound.play("sfx_whoosh", { volume: 0.5 });
    } catch (e) {
      console.log("Whoosh sound error:", e);
    }
  }

  setupInput() {
    this.pointerHeld = false;
    this.pointerPos = { x: 0, y: 0 };
    this.lastWhooshPos = null;

    this.input.on("pointerdown", (p) => {
      if (this.isGameOver || this.isPaused) return;
      this.pointerHeld = true;
      this.pointerPos = { x: p.x, y: p.y };
      this.lastWhooshPos = { x: p.x, y: p.y };
      this.trySliceAtPoint(p.x, p.y);
    });

    this.input.on("pointermove", (p) => {
      if (this.isGameOver || this.isPaused || !p.isDown) return;

      this.pointerPos = { x: p.x, y: p.y };
      this.pushTrailPoint(p.x, p.y, p.time);
      this.renderTrail();

      // Play whoosh every 100px of movement
      if (this.lastWhooshPos) {
        const dx = p.x - this.lastWhooshPos.x;
        const dy = p.y - this.lastWhooshPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= 200) {
          this.playWhoosh();
          this.lastWhooshPos = { x: p.x, y: p.y }; // Reset position for next whoosh
        }
      }

      // Check recent segments for collision
      const len = this.trailPoints.length;
      if (len >= 2) {
        const segmentsToCheck = Math.min(3, len - 1);
        for (let i = 0; i < segmentsToCheck; i++) {
          const idx = len - 1 - i;
          const a = this.trailPoints[idx - 1];
          const b = this.trailPoints[idx];
          this.trySliceSegment(a.x, a.y, b.x, b.y);
        }
      }
    });

    this.input.on("pointerup", () => {
      this.pointerHeld = false;
      this.trailPoints = [];
      this.renderTrail();
    });
  }

  // Slice any fruit at a single point (for tap/hold)
  trySliceAtPoint(px, py) {
    const now = this.time.now;
    const fruits = this.fruits.getChildren();

    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced) continue;
      if (fruit.sliceCooldownUntil && now < fruit.sliceCooldownUntil) continue;

      // Distance from point to fruit center
      const dx = px - fruit.x;
      const dy = py - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Generous radius for tap detection
      const hitRadius = (fruit.width / 2) * 1.4 * fruit.scaleX;
      
      if (dist <= hitRadius) {
        this.sliceFruit(fruit, px - 10, py, px + 10, py);
        return; // One fruit per tap check
      }
    }
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.physics.world.setBounds(0, 0, width, height);
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    this.difficulty.update(delta);

    const { height } = this.scale;

    // If finger is held down, check if any fruit moves into it
    if (this.pointerHeld && this.pointerPos) {
      this.trySliceAtPoint(this.pointerPos.x, this.pointerPos.y);
    }

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

  startSpawning() {
    // Fruit Ninja style: spawn fruits in WAVES
    const spawnWave = () => {
      if (this.isGameOver || this.isPaused || !this.scene.isActive()) return;

      // Get wave settings from difficulty
      const wave = this.difficulty.getWaveSettings();
      
      // Random number of fruits in this wave (1 to wave.maxFruits)
      const fruitsInWave = Phaser.Math.Between(wave.minFruits, wave.maxFruits);
      
      // Spawn each fruit in the wave with slight delay between them
      for (let i = 0; i < fruitsInWave; i++) {
        this.time.delayedCall(i * 80, () => {
          if (!this.isGameOver && !this.isPaused) {
            this.spawnFruit();
          }
        });
      }

      // Wait before next wave
      const waveDelay = Phaser.Math.Between(wave.delayMin, wave.delayMax);
      this.spawnTimer = this.time.delayedCall(waveDelay, spawnWave);
    };

    // First wave after short delay
    this.spawnTimer = this.time.delayedCall(600, spawnWave);
  }

  spawnFruit() {
    const { width, height } = this.scale;
    const bombChance = this.difficulty.getBombChance();
    const hVel = this.difficulty.getHorizontalVelocity(width);
    const gravity = this.difficulty.getGravity(height);

    const isBomb = Math.random() < bombChance;
    // Spawn in center 60% of screen (20% margin on each side)
    const marginX = width * 0.2;
    const x = Phaser.Math.Between(marginX, width - marginX);
    const y = height + 70;

    let fruit;
    if (isBomb) {
      fruit = this.fruits.create(x, y, "bomb");
      fruit.type = "bomb";
      fruit.isBomb = true;
      fruit.fruitScore = 0;
    } else {
      const fruitData = Phaser.Utils.Array.GetRandom(this.fruitTypes);
      fruit = this.fruits.create(x, y, `fruit_${fruitData.name}`);
      fruit.type = fruitData.name;
      fruit.isBomb = false;
      fruit.fruitScore = fruitData.score;
      fruit.fruitColor = fruitData.color;
    }

    fruit.setDepth(10);
    fruit.setCircle(30);
    fruit.sliced = false;
    fruit.sliceCooldownUntil = 0;

    // Horizontal velocity (random direction left or right)
    const vxMag = Phaser.Math.Between(hVel.min, hVel.max);
    const vx = Math.random() < 0.5 ? -vxMag : vxMag;
    
    // Vertical velocity: calculated to peak at center of screen
    // Using physics: v² = u² + 2as → u = sqrt(2 * g * distance)
    const distanceToPeak = y - (height / 2);
    const variation = Phaser.Math.FloatBetween(0.8, 1.0); // 80-100% of way to center
    const vy = -Math.sqrt(2 * gravity * distanceToPeak * variation);

    fruit.body.setVelocity(vx, vy);
    fruit.body.setGravityY(gravity);
    fruit.body.setAngularVelocity(Phaser.Math.Between(-220, 220));

    // Calculate scale so fruit is roughly 14% of screen height
    const targetHeight = height * 0.14;
    const finalScale = targetHeight / fruit.height;
    fruit.setScale(finalScale);
    
    // Hit area larger than visual for forgiving slices
    const radius = (fruit.width / 2) * 1.2;
    fruit.setCircle(radius, (fruit.width / 2) - radius, (fruit.height / 2) - radius);
  }

  pushTrailPoint(x, y, t) {
    // Remove old points based on time
    const now = t || Date.now();
    while (this.trailPoints.length > 0 && now - this.trailPoints[0].t > this.trailMaxAge) {
      this.trailPoints.shift();
    }
    
    this.trailPoints.push({ x, y, t: now });
    
    // Also cap by count
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.shift();
    }
  }

  renderTrail() {
    this.trailGfx.clear();
    const points = this.trailPoints;
    if (points.length < 2) return;

    // Blade trail: tapered line
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const progress = i / (points.length - 1);
      
      // Thicker taper: 2px to 8px
      const width = 2 + progress * 6;
      
      // Fade
      const alpha = progress * 0.85;
      
      this.trailGfx.lineStyle(width, 0xffffff, alpha);
      this.trailGfx.beginPath();
      this.trailGfx.moveTo(prev.x, prev.y);
      this.trailGfx.lineTo(curr.x, curr.y);
      this.trailGfx.strokePath();
    }

    // Bright tip
    if (points.length > 0) {
      const tip = points[points.length - 1];
      this.trailGfx.fillStyle(0xffffff, 0.95);
      this.trailGfx.fillCircle(tip.x, tip.y, 5);
    }
  }

  trySliceSegment(x1, y1, x2, y2) {
    const now = this.time.now;
    const fruits = this.fruits.getChildren();
    
    // Generous bounding box for quick rejection
    const margin = 100;
    const minX = Math.min(x1, x2) - margin;
    const maxX = Math.max(x1, x2) + margin;
    const minY = Math.min(y1, y2) - margin;
    const maxY = Math.max(y1, y2) + margin;

    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced) continue;
      if (fruit.sliceCooldownUntil && now < fruit.sliceCooldownUntil) continue;

      // Fast rejection
      if (fruit.x < minX || fruit.x > maxX || fruit.y < minY || fruit.y > maxY) continue;

      // Generous collision radius (1.3x visual size for forgiving hits)
      const collisionRadius = (fruit.width / 2) * 1.3 * fruit.scaleX;
      
      if (this.segmentIntersectsCircle(x1, y1, x2, y2, fruit.x, fruit.y, collisionRadius)) {
        this.sliceFruit(fruit, x1, y1, x2, y2);
      } else {
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

    if (fruit.isBomb) {
      this.playSfx("gameover");
      this.cameras.main.shake(200, 0.02);
      this.missFruit(fruit);
      return;
    }

    this.playSfx("slice", { volume: 0.6, detune: Phaser.Math.Between(-100, 100) });
    this.comboCount++;
    this.scheduleComboFinalize();

    const comboMultiplier = this.comboCount > 1 ? this.comboCount : 1;
    this.score += fruit.fruitScore * comboMultiplier;
    this.emitGameState();

    // Create juice splash effect
    this.createJuiceSplash(fruit.x, fruit.y, fruit.fruitColor || 0xff4d6d);

    // Create two halves that fly apart
    this.createSlicedHalves(fruit, x1, y1, x2, y2);

    // Hide original fruit immediately
    fruit.setVisible(false);
    this.tweens.add({
      targets: fruit,
      alpha: 0,
      duration: 100,
      onComplete: () => fruit.destroy()
    });
  }

  createSlicedHalves(fruit, x1, y1, x2, y2) {
    const textureKey = fruit.texture.key;
    const frame = fruit.frame.name;
    const x = fruit.x;
    const y = fruit.y;
    const scale = fruit.scaleX;
    const rotation = fruit.rotation;
    
    // Get original texture dimensions
    const texW = fruit.width;
    const texH = fruit.height;
    
    // Calculate slice angle from swipe direction
    const sliceAngle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = sliceAngle + Math.PI / 2;
    
    // Create left half
    const leftHalf = this.add.image(x, y, textureKey, frame);
    leftHalf.setScale(scale);
    leftHalf.setRotation(rotation);
    leftHalf.setDepth(15);
    leftHalf.setCrop(0, 0, texW / 2, texH);
    leftHalf.setOrigin(1, 0.5);
    
    // Create right half
    const rightHalf = this.add.image(x, y, textureKey, frame);
    rightHalf.setScale(scale);
    rightHalf.setRotation(rotation);
    rightHalf.setDepth(15);
    rightHalf.setCrop(texW / 2, 0, texW / 2, texH);
    rightHalf.setOrigin(0, 0.5);
    
    // Phase 1: Quick "pop" apart with slight upward motion (the jerk feeling)
    const popDistance = 20;
    const popUp = 30;
    
    // Left half - pop apart
    this.tweens.add({
      targets: leftHalf,
      x: x + Math.cos(perpAngle + Math.PI) * popDistance,
      y: y - popUp,
      rotation: rotation - 0.3,
      duration: 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Phase 2: Fall with gravity and spin
        this.tweens.add({
          targets: leftHalf,
          x: leftHalf.x + Math.cos(perpAngle + Math.PI) * 80 + Phaser.Math.Between(-30, 30),
          y: leftHalf.y + 350,
          rotation: rotation - 3,
          alpha: 0,
          scale: scale * 0.5,
          duration: 800,
          ease: 'Quad.easeIn',
          onComplete: () => leftHalf.destroy()
        });
      }
    });
    
    // Right half - pop apart
    this.tweens.add({
      targets: rightHalf,
      x: x + Math.cos(perpAngle) * popDistance,
      y: y - popUp,
      rotation: rotation + 0.3,
      duration: 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Phase 2: Fall with gravity and spin
        this.tweens.add({
          targets: rightHalf,
          x: rightHalf.x + Math.cos(perpAngle) * 80 + Phaser.Math.Between(-30, 30),
          y: rightHalf.y + 350,
          rotation: rotation + 3,
          alpha: 0,
          scale: scale * 0.5,
          duration: 800,
          ease: 'Quad.easeIn',
          onComplete: () => rightHalf.destroy()
        });
      }
    });
  }

  createJuiceSplash(x, y, color) {
    // Create static smudge/stain on background
    const smudge = this.add.graphics();
    smudge.setDepth(1);
    smudge.setPosition(x, y);
    
    // Main splat - multiple overlapping circles for organic shape
    smudge.fillStyle(color, 0.7);
    const mainSize = Phaser.Math.Between(35, 55);
    smudge.fillCircle(0, 0, mainSize);
    smudge.fillCircle(Phaser.Math.Between(-15, 15), Phaser.Math.Between(-15, 15), mainSize * 0.7);
    smudge.fillCircle(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-20, 20), mainSize * 0.5);
    
    // Darker center
    const colorObj = Phaser.Display.Color.IntegerToColor(color);
    const darkerColor = Phaser.Display.Color.GetColor(
      Math.max(0, colorObj.red - 50),
      Math.max(0, colorObj.green - 50),
      Math.max(0, colorObj.blue - 50)
    );
    smudge.fillStyle(darkerColor, 0.5);
    smudge.fillCircle(0, 0, mainSize * 0.4);
    
    // Scattered droplets
    smudge.fillStyle(color, 0.6);
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 80);
      const size = Phaser.Math.Between(3, 8);
      smudge.fillCircle(Math.cos(angle) * dist, Math.sin(angle) * dist, size);
    }
    
    smudge.setAlpha(0.85);
    
    // Fade after delay
    this.time.delayedCall(2500, () => {
      if (smudge.active) {
        this.tweens.add({
          targets: smudge,
          alpha: 0,
          duration: 1500,
          onComplete: () => { if (smudge.active) smudge.destroy(); }
        });
      }
    });
  }

  missFruit(fruit) {
    if (!fruit.isBomb) this.playSfx("miss", { volume: 0.5 });
    fruit.destroy();
    this.lives--;
    this.emitGameState();
    if (this.lives <= 0) this.gameOver();
  }

  scheduleComboFinalize() {
    if (this.comboTimeout) this.comboTimeout.remove(false);
    this.comboTimeout = this.time.delayedCall(this.comboWindowMs, () => {
      if (this.comboCount >= 3) {
        this.events.emit("show-combo", this.comboCount);
        this.playSfx("combo", { volume: 0.7, detune: Math.min(this.comboCount * 50, 300) });
      }
      this.comboCount = 0;
    });
  }

  emitGameState() {
    this.events.emit("update-score", this.score);
    this.events.emit("update-lives", this.lives);
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.playSfx("gameover", { volume: 0.7 });
    if (this.spawnTimer) this.spawnTimer.remove(false);
    
    const isNewBest = StorageManager.updateBestScore("default", this.score);
    
    this.scene.stop("UIScene");
    this.scene.launch("GameOverScene", { 
      score: this.score, 
      isNewBest: isNewBest
    });
  }

  pauseGame() { this.isPaused = true; this.physics.pause(); if (this.spawnTimer) this.spawnTimer.paused = true; }
  resumeGame() { this.isPaused = false; this.physics.resume(); if (this.spawnTimer) this.spawnTimer.paused = false; }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
    this.events.off("pause-game", this.pauseGame, this);
    this.events.off("resume-game", this.resumeGame, this);
  }
}
