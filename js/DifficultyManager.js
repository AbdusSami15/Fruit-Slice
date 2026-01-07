/**
 * DifficultyManager - Handles progressive difficulty scaling
 * 
 * Difficulty increases over time:
 * - Wave size increases (more fruits per throw)
 * - Gap between waves decreases
 * - Bomb chance increases
 */
class DifficultyManager {
  constructor() {
    this.elapsedTime = 0;
  }

  /**
   * Update elapsed game time
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
   * Get current difficulty progress (0 = start, 1 = max)
   * Smooth curve that approaches 1 over ~90 seconds
   */
  getProgress() {
    const t = this.elapsedTime / 1000; // seconds
    const rampTime = 90; // 90 seconds to reach ~90% difficulty
    return 1 - Math.exp(-2.3 * t / rampTime);
  }

  /**
   * Interpolate between start and end values
   */
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  /**
   * Get gravity scaled to screen height
   */
  getGravity(screenHeight = 720) {
    const baseGravity = 450; // Very slow, floaty feel
    const scale = screenHeight / 720;
    return Math.round(baseGravity * scale);
  }

  /**
   * Get horizontal velocity range scaled to screen
   */
  getHorizontalVelocity(screenWidth = 1280) {
    const scale = screenWidth / 1280;
    return {
      min: Math.round(80 * scale),   // Slower horizontal movement
      max: Math.round(200 * scale)
    };
  }

  /**
   * Get bomb spawn chance (0-1)
   */
  getBombChance() {
    const p = this.getProgress();
    return this.lerp(0.05, 0.18, p); // 5% to 18%
  }

  /**
   * Get wave settings (Fruit Ninja style)
   */
  getWaveSettings() {
    const p = this.getProgress();
    
    return {
      // Fruits per wave: starts 1-2, ends 4-6
      minFruits: Math.round(this.lerp(1, 4, p)),
      maxFruits: Math.round(this.lerp(2, 6, p)),
      // Delay between waves: starts 1.5-2.2s, ends 0.8-1.2s
      delayMin: Math.round(this.lerp(1500, 800, p)),
      delayMax: Math.round(this.lerp(2200, 1200, p))
    };
  }

  /**
   * Get starting lives
   */
  getStartingLives() {
    return 3;
  }

  /**
   * Debug info
   */
  getDebugInfo() {
    const wave = this.getWaveSettings();
    return {
      elapsed: Math.round(this.elapsedTime / 1000) + "s",
      progress: (this.getProgress() * 100).toFixed(1) + "%",
      fruitsPerWave: `${wave.minFruits}-${wave.maxFruits}`,
      waveDelay: `${wave.delayMin}-${wave.delayMax}ms`,
      bombChance: (this.getBombChance() * 100).toFixed(1) + "%"
    };
  }
}
