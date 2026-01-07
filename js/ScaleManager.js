/**
 * ScaleManager - Handles responsive scaling and orientation logic
 */
class ScaleManager {
  static BASE_WIDTH = 1280;
  static BASE_HEIGHT = 720;

  /**
   * Get scale factor based on orientation
   */
  static getScale(width, height) {
    const isPortrait = height > width;
    
    if (isPortrait) {
      // Scale for portrait (Menu) - fit 720 width
      return Math.min(width / 720, height / 1280, 1.0);
    } else {
      // Scale for landscape (Game) - fit 1280x720
      const scaleX = width / ScaleManager.BASE_WIDTH;
      const scaleY = height / ScaleManager.BASE_HEIGHT;
      return Math.min(scaleX, scaleY);
    }
  }

  /**
   * Scale a value
   */
  static scale(value, width, height) {
    return value * ScaleManager.getScale(width, height);
  }

  /**
   * Get font size
   */
  static fontSize(baseSize, width, height) {
    const scale = ScaleManager.getScale(width, height);
    return Math.max(12, Math.round(baseSize * scale));
  }

  /**
   * Check if device is mobile
   */
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

