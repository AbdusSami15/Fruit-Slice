/**
 * DifficultyManager - Handles progressive difficulty scaling
 * 
 * Manages smooth curves for:
 * - Spawn interval (time between fruit spawns)
 * - Launch velocity (how fast/high fruits are thrown)
 * - Max simultaneous fruits on screen
 * - Bomb spawn chance
 */
class DifficultyManager {
  constructor(mode = "normal") {
    this.mode = mode;
    this.elapsedTime = 0;
    this.preset = DifficultyManager.PRESETS[mode] || DifficultyManager.PRESETS.normal;
  }

  /**
   * Update elapsed game time (call from scene update or timer)
   */
  update(delta) {
    this.elapsedTime += delta;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.elapsedTime = 0;
  }

  /**
   * Set difficulty mode
   */
  setMode(mode) {
    this.mode = mode;
    this.preset = DifficultyManager.PRESETS[mode] || DifficultyManager.PRESETS.normal;
    this.reset();
  }

  /**
   * Get current difficulty progress (0 = start, 1 = max difficulty)
   * Uses smooth easing curve that approaches but never quite reaches 1
   */
  getProgress() {
    const t = this.elapsedTime / 1000; // Convert to seconds
    const rampTime = this.preset.rampDuration; // Time to reach ~90% difficulty
    
    // Asymptotic curve: approaches 1 but never exceeds it
    // At rampTime seconds, progress ≈ 0.9
    return 1 - Math.exp(-2.3 * t / rampTime);
  }

  /**
   * Interpolate between start and end values based on progress
   */
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  /**
   * Get current spawn interval range [min, max] in milliseconds
   */
  getSpawnInterval() {
    const p = this.getProgress();
    const { spawnInterval } = this.preset;
    
    return {
      min: Math.round(this.lerp(spawnInterval.startMin, spawnInterval.endMin, p)),
      max: Math.round(this.lerp(spawnInterval.startMax, spawnInterval.endMax, p))
    };
  }

  /**
   * Get current launch velocity range, scaled to screen height
   * @param {number} screenHeight - Current screen height for scaling (base: 720)
   * @param {number} screenWidth - Current screen width for horizontal scaling (base: 1280)
   */
  getLaunchVelocity(screenHeight = 720, screenWidth = 1280) {
    const p = this.getProgress();
    const { launchVelocity } = this.preset;
    
    // Scale velocities based on screen size (base dimensions: 1280x720)
    const vyScale = screenHeight / 720;
    const vxScale = screenWidth / 1280;
    
    return {
      // Horizontal spread (scaled to screen width)
      vxMin: Math.round(this.lerp(launchVelocity.vxRange[0], launchVelocity.vxRange[1], p) * vxScale),
      vxMax: Math.round(this.lerp(-launchVelocity.vxRange[0], -launchVelocity.vxRange[1], p) * vxScale) * -1,
      // Vertical (negative = upward, scaled to screen height)
      vyMin: Math.round(this.lerp(launchVelocity.vyStartMin, launchVelocity.vyEndMin, p) * vyScale),
      vyMax: Math.round(this.lerp(launchVelocity.vyStartMax, launchVelocity.vyEndMax, p) * vyScale)
    };
  }

  /**
   * Get gravity scaled to screen height
   */
  getGravity(screenHeight = 720) {
    const scale = screenHeight / 720;
    return Math.round(this.preset.gravity * scale);
  }

  /**
   * Get maximum simultaneous fruits allowed on screen
   */
  getMaxSimultaneousFruits() {
    const p = this.getProgress();
    const { maxFruits } = this.preset;
    
    return Math.round(this.lerp(maxFruits.start, maxFruits.end, p));
  }

  /**
   * Get current bomb spawn chance (0-1)
   */
  getBombChance() {
    const p = this.getProgress();
    const { bombChance } = this.preset;
    
    return this.lerp(bombChance.start, bombChance.end, p);
  }

  /**
   * Get starting lives for this difficulty
   */
  getStartingLives() {
    return this.preset.lives;
  }

  /**
   * Get a debug string showing current difficulty state
   */
  getDebugInfo() {
    const spawn = this.getSpawnInterval();
    const vel = this.getLaunchVelocity();
    return {
      mode: this.mode,
      elapsed: Math.round(this.elapsedTime / 1000) + "s",
      progress: (this.getProgress() * 100).toFixed(1) + "%",
      spawnInterval: `${spawn.min}-${spawn.max}ms`,
      launchVy: `${vel.vyMin} to ${vel.vyMax}`,
      maxFruits: this.getMaxSimultaneousFruits(),
      bombChance: (this.getBombChance() * 100).toFixed(1) + "%"
    };
  }
}

/**
 * Difficulty presets
 * Each defines the curve parameters for that mode
 */
DifficultyManager.PRESETS = {
  // Tuned for landscape 1280x720
  easy: {
    lives: 5,
    gravity: 900,
    rampDuration: 180, // 3 minutes to reach ~90% difficulty
    
    spawnInterval: {
      startMin: 1400, startMax: 2000,  // Initial: slow spawns
      endMin: 700,    endMax: 1000     // Final: moderate spawns
    },
    
    launchVelocity: {
      vxRange: [180, 280],             // Wider horizontal spread for landscape
      vyStartMin: -580, vyStartMax: -480,  // Adjusted for shorter screen
      vyEndMin: -650,   vyEndMax: -530
    },
    
    maxFruits: {
      start: 3,
      end: 6
    },
    
    bombChance: {
      start: 0.05,
      end: 0.10
    }
  },

  normal: {
    lives: 3,
    gravity: 1000,
    rampDuration: 120, // 2 minutes to reach ~90% difficulty
    
    spawnInterval: {
      startMin: 1000, startMax: 1500,
      endMin: 400,    endMax: 650
    },
    
    launchVelocity: {
      vxRange: [200, 320],
      vyStartMin: -620, vyStartMax: -500,
      vyEndMin: -700,   vyEndMax: -580
    },
    
    maxFruits: {
      start: 4,
      end: 10
    },
    
    bombChance: {
      start: 0.08,
      end: 0.15
    }
  },

  hard: {
    lives: 2,
    gravity: 1100,
    rampDuration: 90, // 1.5 minutes to reach ~90% difficulty
    
    spawnInterval: {
      startMin: 700,  startMax: 1100,
      endMin: 250,    endMax: 450
    },
    
    launchVelocity: {
      vxRange: [240, 380],
      vyStartMin: -680, vyStartMax: -540,
      vyEndMin: -780,   vyEndMax: -640
    },
    
    maxFruits: {
      start: 5,
      end: 14
    },
    
    bombChance: {
      start: 0.12,
      end: 0.22
    }
  }
};

