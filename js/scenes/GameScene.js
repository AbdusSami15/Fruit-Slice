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

    // Reset bomb gameover latch each round (scene instance is reused)
    this._bombGameOverTriggered = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background - fill entire screen
    this.cameras.main.setBackgroundColor("#0b0f14");
    if (this.textures.exists("background")) {
      this.bg = this.add.image(width / 2, height / 2, "background");
      const scale = Math.max(width / this.bg.width, height / this.bg.height);
      this.bg.setScale(scale).setAlpha(0.8);
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
    
    // Resize background to cover entire screen
    if (this.bg) {
      this.bg.setPosition(width / 2, height / 2);
      const scale = Math.max(width / this.bg.width, height / this.bg.height);
      this.bg.setScale(scale);
    }
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

    // Launch "popup" sound for fruits (not bombs)
    if (!isBomb) {
      this.playSfx("popup", { volume: 0.25, rate: Phaser.Math.FloatBetween(0.97, 1.03) });
    }

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
      this.playSfx("bomb", { volume: 0.7 });
      // Sequence: flash -> shake -> game over
      if (this._bombGameOverTriggered) return;
      this._bombGameOverTriggered = true;

      // Freeze gameplay during the effects
      this.isPaused = true;
      this.physics.pause();
      if (this.spawnTimer) this.spawnTimer.remove(false);

      fruit.destroy();

      const flashMs = 160;
      const shakeMs = 220;
      this.cameras.main.flash(flashMs, 255, 255, 255);

      this.time.delayedCall(flashMs, () => {
        this.cameras.main.shake(shakeMs, 0.02);
      });

      this.time.delayedCall(flashMs + shakeMs, () => {
        this.gameOver();
      });
      return;
    }

    this.playSfx("slice", { volume: 0.6, detune: Phaser.Math.Between(-100, 100) });
    this.comboCount++;
    this.scheduleComboFinalize();

    // Score: always +1 per fruit sliced (no fruit-type points, no combo multiplier)
    this.score += 1;
    this.emitGameState();

    // Spawn a floating "+1" via HTML UI (UIScene)
    this.events.emit("plus-one", { x: fruit.x, y: fruit.y, text: "+1" });

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

  spawnPointPopup(x, y, text) {
    const { width, height } = this.scale;
    const fontSize = ScaleManager?.fontSize ? ScaleManager.fontSize(32, width, height) : 28;

    const popup = this.add.text(x, y, text, {
      fontFamily: "Arial Black",
      fontSize: `${fontSize}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(1001);

    popup.setScale(0.6);
    popup.setAlpha(0.0);

    this.tweens.add({
      targets: popup,
      y: y - Math.max(60, height * 0.05),
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          alpha: 0,
          duration: 420,
          ease: "Quad.easeIn",
          onComplete: () => popup.destroy()
        });
      }
    });
  }

  createSlicedHalves(fruit, x1, y1, x2, y2) {
    const textureKey = fruit.texture.key;
    const frame = fruit.frame?.name;
    const x = fruit.x;
    const y = fruit.y;
    const scale = fruit.scaleX;
    const rotation = fruit.rotation;

    const { width, height } = this.scale;
    const screenScale = Math.min(width, height) / 720;

    // Get original texture dimensions (unscaled)
    const texW = fruit.width;
    const texH = fruit.height;

    // Slice normal (perpendicular to swipe)
    const sliceAngle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = sliceAngle + Math.PI / 2;
    const nx = Math.cos(perpAngle);
    const ny = Math.sin(perpAngle);

    // Inherit the fruit's motion so the cut feels continuous
    const baseVx = fruit.body?.velocity?.x || 0;
    const baseVy = fruit.body?.velocity?.y || 0;

    const gravity = this.difficulty.getGravity(height);
    // Keep pieces close to the cut point (more "juicey" and less floaty)
    const push = (120 + Phaser.Math.Between(-25, 25)) * screenScale;
    const lift = (70 + Phaser.Math.Between(-20, 20)) * screenScale; // small upward impulse
    const maxExtraSpeed = 420 * screenScale;

    const makeHalf = (isLeft) => {
      const half = this.physics.add.image(x, y, textureKey, frame);
      half.setScale(scale);
      half.setRotation(rotation);
      half.setDepth(15);
      half.setAlpha(1);

      // Crop to half texture
      if (isLeft) {
        half.setCrop(0, 0, texW / 2, texH);
        half.setOrigin(1, 0.5);
      } else {
        half.setCrop(texW / 2, 0, texW / 2, texH);
        half.setOrigin(0, 0.5);
      }

      // Physics tuning: mild damping + gravity, small angular velocity
      half.body.setAllowGravity(true);
      half.body.setGravityY(gravity);
      // Arcade: damping uses drag coefficient (0..1). Keep it subtle.
      half.body.setDamping(true);
      half.body.setDrag(0.35);

      // Small separation impulse along the slice normal
      const dir = isLeft ? -1 : 1;
      let vx = baseVx + dir * nx * push + Phaser.Math.Between(-20, 20) * screenScale;
      let vy = baseVy + dir * ny * push - lift;

      // Clamp to avoid pieces flying across the whole screen
      const mag = Math.sqrt(vx * vx + vy * vy) || 1;
      if (mag > maxExtraSpeed) {
        const s = maxExtraSpeed / mag;
        vx *= s;
        vy *= s;
      }
      half.body.setVelocity(vx, vy);

      half.setAngularVelocity(Phaser.Math.Between(-180, 180));

      // Fade out (no forced downward tween / no forced rotation tween)
      this.time.delayedCall(420, () => {
        if (!half.active) return;
        this.tweens.add({
          targets: half,
          alpha: 0,
          duration: 360,
          ease: "Quad.easeIn",
          onComplete: () => { if (half.active) half.destroy(); }
        });
      });

      return half;
    };

    makeHalf(true);
    makeHalf(false);
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
