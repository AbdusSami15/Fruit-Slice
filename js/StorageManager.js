/**
 * StorageManager - Handles localStorage persistence for game settings and scores
 * 
 * Stored data structure:
 * {
 *   soundEnabled: boolean,
 *   bestScores: { easy: number, normal: number, hard: number }
 * }
 */
class StorageManager {
  static STORAGE_KEY = "fruitSlice_save";

  /**
   * Load all saved data from localStorage
   */
  static load() {
    try {
      const data = localStorage.getItem(StorageManager.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed to load save data:", e);
    }
    return StorageManager.getDefaults();
  }

  /**
   * Save all data to localStorage
   */
  static save(data) {
    try {
      localStorage.setItem(StorageManager.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Failed to save data:", e);
      return false;
    }
  }

  /**
   * Get default save data
   */
  static getDefaults() {
    return {
      soundEnabled: true,
      bestScores: {
        easy: 0,
        normal: 0,
        hard: 0
      }
    };
  }

  /**
   * Get sound enabled state
   */
  static getSoundEnabled() {
    const data = StorageManager.load();
    return data.soundEnabled;
  }

  /**
   * Set sound enabled state
   */
  static setSoundEnabled(enabled) {
    const data = StorageManager.load();
    data.soundEnabled = enabled;
    StorageManager.save(data);
  }

  /**
   * Get best score for a difficulty
   */
  static getBestScore(difficulty) {
    const data = StorageManager.load();
    return data.bestScores[difficulty] || 0;
  }

  /**
   * Get all best scores
   */
  static getAllBestScores() {
    const data = StorageManager.load();
    return data.bestScores;
  }

  /**
   * Update best score if new score is higher
   * Returns true if it was a new best
   */
  static updateBestScore(difficulty, score) {
    const data = StorageManager.load();
    const currentBest = data.bestScores[difficulty] || 0;
    
    if (score > currentBest) {
      data.bestScores[difficulty] = score;
      StorageManager.save(data);
      return true;
    }
    return false;
  }

  /**
   * Clear all saved data
   */
  static clear() {
    try {
      localStorage.removeItem(StorageManager.STORAGE_KEY);
      return true;
    } catch (e) {
      console.warn("Failed to clear save data:", e);
      return false;
    }
  }
}

