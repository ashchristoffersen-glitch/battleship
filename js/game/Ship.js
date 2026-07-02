/**
 * Represents a single ship on the board.
 */
export default class Ship {
  /**
   * @param {string} name  - Display name (e.g. "Carrier").
   * @param {number} length - Number of cells the ship occupies.
   */
  constructor(name, length) {
    this.name = name;
    this.length = length;
    this.hits = new Array(length).fill(false);
  }

  /**
   * Register a hit at the given position index (0-based within the ship).
   * @param {number} index
   */
  hit(index) {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Hit index ${index} out of range for ${this.name} (length ${this.length})`);
    }
    this.hits[index] = true;
  }

  isSunk() {
    return this.hits.every(Boolean);
  }
}
