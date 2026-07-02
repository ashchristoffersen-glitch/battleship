import Ship from './Ship.js';

const SIZE = 10;

/**
 * Cell states visible to the opponent:
 *   null  – not yet attacked
 *   'miss'
 *   'hit'
 */

/**
 * Internal cell representation:
 *   null           – empty water
 *   { ship, index } – occupied by `ship` at position `index`
 */

export default class Board {
  constructor() {
    this.size = SIZE;

    /** @type {(null|{ship: Ship, index: number})[][]} */
    this.grid = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));

    /** @type {(null|'miss'|'hit')[][]} */
    this.attacks = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));

    /** @type {Ship[]} */
    this.ships = [];
  }

  /**
   * Place a ship on the board.
   * @param {string} name
   * @param {number} length
   * @param {number} row      - Starting row (0-based).
   * @param {number} col      - Starting col (0-based).
   * @param {boolean} vertical - true = ship runs top-to-bottom.
   * @returns {Ship} the placed ship.
   */
  placeShip(name, length, row, col, vertical) {
    const cells = this._shipCells(length, row, col, vertical);
    if (!this._canPlace(cells)) {
      throw new Error(`Cannot place ${name} at (${row},${col}) ${vertical ? 'vertical' : 'horizontal'}`);
    }

    const ship = new Ship(name, length);
    cells.forEach(([r, c], i) => {
      this.grid[r][c] = { ship, index: i };
    });
    this.ships.push(ship);
    return ship;
  }

  /**
   * Check whether a ship can be placed at the given position.
   */
  canPlaceShip(length, row, col, vertical) {
    const cells = this._shipCells(length, row, col, vertical);
    return this._canPlace(cells);
  }

  /**
   * Receive an attack at (row, col).
   * @returns {{ result: 'miss'|'hit', ship: Ship|null, sunk: boolean }}
   */
  receiveAttack(row, col) {
    if (this.attacks[row][col] !== null) {
      throw new Error(`Cell (${row},${col}) already attacked`);
    }

    const cell = this.grid[row][col];
    if (cell === null) {
      this.attacks[row][col] = 'miss';
      return { result: 'miss', ship: null, sunk: false };
    }

    cell.ship.hit(cell.index);
    this.attacks[row][col] = 'hit';
    return { result: 'hit', ship: cell.ship, sunk: cell.ship.isSunk() };
  }

  allSunk() {
    return this.ships.length > 0 && this.ships.every((s) => s.isSunk());
  }

  /**
   * Return the coordinates occupied by a placed ship.
   * @param {Ship} ship
   * @returns {[number, number][]}
   */
  getShipCells(ship) {
    const cells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] !== null && this.grid[r][c].ship === ship) {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }

  /**
   * Randomly place all ships from the given fleet definition.
   * @param {{ name: string, length: number }[]} fleet
   */
  placeFleetRandomly(fleet) {
    for (const { name, length } of fleet) {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * SIZE);
        const col = Math.floor(Math.random() * SIZE);
        const vertical = Math.random() < 0.5;
        if (this.canPlaceShip(length, row, col, vertical)) {
          this.placeShip(name, length, row, col, vertical);
          placed = true;
        }
      }
    }
  }

  // ---- private helpers ----

  _shipCells(length, row, col, vertical) {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const r = vertical ? row + i : row;
      const c = vertical ? col : col + i;
      cells.push([r, c]);
    }
    return cells;
  }

  _canPlace(cells) {
    return cells.every(
      ([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE && this.grid[r][c] === null,
    );
  }
}
