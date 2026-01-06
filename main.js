class FruitSliceScene extends Phaser.Scene {
  constructor() {
    super("FruitSliceScene");

    // Gameplay
    this.score = 0;
    this.lives = 3;
    this.isGameOver = false;

    // Spawning / difficulty
    this.spawnMin = 900;  // ms
    this.spawnMax = 1400; // ms
    this.spawnTimer = null;
    this.difficultyTimer = null;

    // Input trail
    this.trailPoints = [];
    this.maxTrailPoints = 14;
    this.minSliceSpeed = 900; // px/sec threshold to count as a slice swing

    // Audio placeholders (optional later)
  }

  preload() {
    // No external assets needed. We generate textures procedurally.
    this.createProceduralTextures();
  }

  create() {
    const { width, height } = this.scale;

    this.isGameOver = false;
    this.score = 0;
    this.lives = 3;
    this.trailPoints = [];

    // Background
    this.cameras.main.setBackgroundColor("#0b0f14");

    // Physics world
    this.physics.world.setBounds(0, 0, width, height);

    // Groups
    this.fruits = this.physics.add.group();
    this.juice = this.add.particles(0, 0, "juiceDot");

    // UI
    this.scoreText = this.add.text(20, 20, "", {
      fontFamily: "Arial Black",
      fontSize: "28px",
      color: "#ffffff"
    });

    this.livesText = this.add.text(width - 20, 20, "", {
      fontFamily: "Arial Black",
      fontSize: "28px",
      color: "#ffffff"
    }).setOrigin(1, 0);

    this.updateUI();

    // Swipe trail graphics
    this.trailGfx = this.add.graphics();
    this.trailGfx.setDepth(1000);

    // Input: unified mouse + touch
    this.input.on("pointerdown", (p) => {
      if (this.isGameOver) return;
      this.trailPoints.length = 0;
      this.pushTrailPoint(p.x, p.y, p.time);
    });

    this.input.on("pointermove", (p) => {
      if (this.isGameOver) return;
      if (!p.isDown) return;

      this.pushTrailPoint(p.x, p.y, p.time);
      this.renderTrail();

      // Try slice on latest segment
      if (this.trailPoints.length >= 2) {
        const a = this.trailPoints[this.trailPoints.length - 2];
        const b = this.trailPoints[this.trailPoints.length - 1];

        const dt = Math.max(1, (b.t - a.t)); // ms
        const speed = (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / dt) * 1000; // px/sec

        if (speed >= this.minSliceSpeed) {
          this.trySliceSegment(a.x, a.y, b.x, b.y);
        }
      }
    });

    this.input.on("pointerup", () => {
      // fade out trail quickly
      this.time.delayedCall(80, () => {
        this.trailPoints.length = 0;
        this.renderTrail();
      });
    });

    // Start spawning + difficulty scaling
    this.startSpawning();
    this.startDifficultyScaling();

    // Resize support
    this.scale.on("resize", this.handleResize, this);
  }

  handleResize() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
    this.livesText.setPosition(width - 20, 20);
    if (this.isGameOver && this.gameOverContainer) {
      this.gameOverContainer.setPosition(width * 0.5, height * 0.5);
      this.gameOverOverlay.setSize(width, height).setPosition(width * 0.5, height * 0.5);
    }
  }

  update() {
    if (this.isGameOver) return;

    const { height } = this.scale;

    // Missed fruits: if fruit falls below screen unsliced -> lose life
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
  // Textures (no external assets)
  // ----------------------------
  createProceduralTextures() {
    // Fruit texture variants
    const makeCircle = (key, color) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(32, 32, 28);
      g.lineStyle(4, 0x000000, 0.15);
      g.strokeCircle(32, 32, 28);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    makeCircle("fruit_red", 0xff4d6d);
    makeCircle("fruit_green", 0x52b788);
    makeCircle("fruit_yellow", 0xffc300);
    makeCircle("fruit_purple", 0x9d4edd);

    // Half textures (simple visual)
    const makeHalf = (key, color, flip) => {
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

    makeHalf("half_red_a", 0xff4d6d, false);
    makeHalf("half_red_b", 0xff4d6d, true);

    makeHalf("half_green_a", 0x52b788, false);
    makeHalf("half_green_b", 0x52b788, true);

    makeHalf("half_yellow_a", 0xffc300, false);
    makeHalf("half_yellow_b", 0xffc300, true);

    makeHalf("half_purple_a", 0x9d4edd, false);
    makeHalf("half_purple_b", 0x9d4edd, true);

    // Juice particle dot
    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.fillStyle(0xffffff, 1);
    g2.fillCircle(4, 4, 4);
    g2.generateTexture("juiceDot", 8, 8);
    g2.destroy();
  }

  // ----------------------------
  // Spawning / difficulty
  // ----------------------------
  startSpawning() {
    if (this.spawnTimer) this.spawnTimer.remove(false);

    const spawnOnce = () => {
      if (this.isGameOver) return;
      this.spawnFruit();

      const delay = Phaser.Math.Between(this.spawnMin, this.spawnMax);
      this.spawnTimer = this.time.delayedCall(delay, spawnOnce);
    };

    this.spawnTimer = this.time.delayedCall(400, spawnOnce);
  }

  startDifficultyScaling() {
    if (this.difficultyTimer) this.difficultyTimer.remove(false);

    // every 8 seconds, tighten spawn range a bit
    this.difficultyTimer = this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        // clamp so it doesn't get absurd
        this.spawnMin = Math.max(350, this.spawnMin - 70);
        this.spawnMax = Math.max(550, this.spawnMax - 90);
      }
    });
  }

  spawnFruit() {
    const { width, height } = this.scale;

    const types = ["red", "green", "yellow", "purple"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const key = `fruit_${type}`;

    const x = Phaser.Math.Between(60, width - 60);
    const y = height + 70;

    const fruit = this.fruits.create(x, y, key);
    fruit.setDepth(10);
    fruit.setCircle(26);
    fruit.setBounce(0.2);
    fruit.setCollideWorldBounds(false);

    fruit.type = type;
    fruit.sliced = false;

    // Launch upward with random angle
    const vx = Phaser.Math.Between(-160, 160);
    const vy = Phaser.Math.Between(-980, -760);

    fruit.body.setVelocity(vx, vy);
    fruit.body.setGravityY(1200); // gravity pull down
    fruit.body.setAngularVelocity(Phaser.Math.Between(-220, 220));

    // Slight scale variation
    fruit.setScale(Phaser.Math.FloatBetween(0.9, 1.1));
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

    // Draw from older -> newer (thicker towards newest)
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
    const fruits = this.fruits.getChildren();
    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced) continue;

      // segment-circle intersection (approx)
      const r = 28 * fruit.scaleX;
      if (this.segmentIntersectsCircle(x1, y1, x2, y2, fruit.x, fruit.y, r)) {
        this.sliceFruit(fruit, x1, y1, x2, y2);
      }
    }
  }

  segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    // Closest point on segment to circle center
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

    // Score
    this.score += 10;
    this.updateUI();

    // Juice particles: direction based on slice segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    this.juice.createEmitter({
      x: fruit.x,
      y: fruit.y,
      lifespan: 500,
      speed: { min: 120, max: 420 },
      angle: { min: Phaser.Math.RadToDeg(angle) - 60, max: Phaser.Math.RadToDeg(angle) + 60 },
      scale: { start: 0.45, end: 0 },
      quantity: 10,
      frequency: -1,
      tint: this.juiceTintForType(fruit.type),
      blendMode: "ADD"
    }).explode(18, fruit.x, fruit.y);

    // Replace with 2 halves that fall
    this.spawnHalves(fruit);

    // Slice pop animation then remove original
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

  spawnHalves(fruit) {
    const type = fruit.type;
    const aKey = `half_${type}_a`;
    const bKey = `half_${type}_b`;

    const left = this.physics.add.sprite(fruit.x - 12, fruit.y, aKey);
    const right = this.physics.add.sprite(fruit.x + 12, fruit.y, bKey);

    left.setScale(fruit.scaleX);
    right.setScale(fruit.scaleX);

    left.body.setGravityY(1200);
    right.body.setGravityY(1200);

    // Give split impulse
    left.body.setVelocity(fruit.body.velocity.x - 160, fruit.body.velocity.y - 80);
    right.body.setVelocity(fruit.body.velocity.x + 160, fruit.body.velocity.y - 80);

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

  juiceTintForType(type) {
    switch (type) {
      case "red": return 0xff4d6d;
      case "green": return 0x52b788;
      case "yellow": return 0xffc300;
      case "purple": return 0x9d4edd;
      default: return 0xffffff;
    }
  }

  // ----------------------------
  // Miss / Game Over
  // ----------------------------
  missFruit(fruit) {
    fruit.destroy();
    this.lives -= 1;
    this.updateUI();

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.isGameOver = true;

    if (this.spawnTimer) this.spawnTimer.remove(false);
    if (this.difficultyTimer) this.difficultyTimer.remove(false);

    // Disable further input trail
    this.trailPoints.length = 0;
    this.renderTrail();

    // Overlay
    const { width, height } = this.scale;
    this.gameOverOverlay = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x000000, 0.72).setDepth(2000);

    this.gameOverContainer = this.add.container(width * 0.5, height * 0.5).setDepth(2100);

    const panel = this.add.rectangle(0, 0, 520, 420, 0x111827, 1);
    panel.setStrokeStyle(4, 0xffffff, 0.15);

    const title = this.add.text(0, -120, "GAME OVER", {
      fontFamily: "Arial Black",
      fontSize: "56px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const stats = this.add.text(0, -30, `SCORE: ${this.score}`, {
      fontFamily: "Arial Black",
      fontSize: "34px",
      color: "#4cc9f0"
    }).setOrigin(0.5);

    const btn = this.makeButton(0, 90, "RESTART", () => this.scene.restart());

    this.gameOverContainer.add([panel, title, stats, ...btn]);

    this.tweens.add({
      targets: this.gameOverContainer,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1 },
      duration: 280,
      ease: "Back.easeOut"
    });
  }

  makeButton(x, y, label, onClick) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 320, 84, 0xf72585, 1);
    bg.setStrokeStyle(3, 0xffffff, 0.25);

    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: "30px",
      color: "#ffffff"
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setDepth(2200);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => container.setScale(1.05));
    bg.on("pointerout", () => container.setScale(1.0));
    bg.on("pointerdown", () => container.setScale(0.95));
    bg.on("pointerup", () => {
      container.setScale(1.05);
      onClick();
    });

    return [container];
  }

  updateUI() {
    const { width } = this.scale;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.livesText.setText(`LIVES: ${this.lives}`);
    this.livesText.setX(width - 20);
  }
}

// Phaser config (CDN)
const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0f14",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [FruitSliceScene]
};

new Phaser.Game(config);
