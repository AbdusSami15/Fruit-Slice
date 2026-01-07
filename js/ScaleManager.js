/**
 * ScaleManager - Handles responsive scaling for UI elements
 * 
 * Base design dimensions: 1280x720 (landscape)
 * All sizes are designed for this resolution and scaled proportionally
 */
class ScaleManager {
  static BASE_WIDTH = 1280;
  static BASE_HEIGHT = 720;

  /**
   * Get scale factor based on current screen size
   * Uses the smaller ratio to ensure everything fits
   */
  static getScale(width, height) {
    const scaleX = width / ScaleManager.BASE_WIDTH;
    const scaleY = height / ScaleManager.BASE_HEIGHT;
    return Math.min(scaleX, scaleY);
  }

  /**
   * Get scale factor for width only (for horizontal spacing)
   */
  static getScaleX(width) {
    return width / ScaleManager.BASE_WIDTH;
  }

  /**
   * Get scale factor for height only (for vertical spacing)
   */
  static getScaleY(height) {
    return height / ScaleManager.BASE_HEIGHT;
  }

  /**
   * Scale a value based on screen size
   */
  static scale(value, width, height) {
    return Math.round(value * ScaleManager.getScale(width, height));
  }

  /**
   * Get scaled font size (with min/max bounds)
   */
  static fontSize(baseSize, width, height, minSize = 12, maxSize = 100) {
    const scaled = baseSize * ScaleManager.getScale(width, height);
    return Math.round(Math.max(minSize, Math.min(maxSize, scaled)));
  }

  /**
   * Check if device is likely mobile (narrow or short screen)
   */
  static isMobile(width, height) {
    return width < 768 || height < 500;
  }

  /**
   * Get fruit scale based on screen size
   */
  static getFruitScale(width, height) {
    const base = ScaleManager.getScale(width, height);
    // Fruits should be slightly larger on mobile for easier slicing
    if (ScaleManager.isMobile(width, height)) {
      return Math.max(0.6, base * 1.1);
    }
    return Math.max(0.5, base);
  }
}

