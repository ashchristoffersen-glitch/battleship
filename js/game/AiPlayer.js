import Player from './Player.js';

const DIRECTIONS = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

/**
 * AI opponent with two difficulty modes.
 *
 * 'normal' (default): hunt-and-target with parity.
 *   Hunt mode:  fires at random parity-compliant cells.
 *   Target mode: systematically probes neighbours of known hits
 *                along the discovered axis until the ship sinks.
 *
 * 'easy': fires at purely random un-attacked cells with no
 *         hunt or target behaviour.
 */
export default class AiPlayer extends Player {
  /**
   * @param {import('./Board.js').default} ownBoard  – the AI's own board.
   * @param {import('./Board.js').default} enemyBoard – the human's board (for querying state).
   * @param {'easy'|'normal'} [difficulty='normal']
   */
  constructor(ownBoard, enemyBoard, difficulty = 'normal') {
    super('Computer', ownBoard);
    this.enemyBoard = enemyBoard;
    this.difficulty = difficulty;

    /** Cells still available for hunt-mode shots (parity-filtered in normal, all cells in easy). */
    this.huntPool = this._buildHuntPool();

    /**
     * Stack of {row, col} targets queued after a hit (unused in easy mode).
     * @type {{ row: number, col: number }[]}
     */
    this.targetStack = [];

    /**
     * Unresolved hits that haven't yet been attributed to a sunk ship.
     * Used to determine axis and to clean the stack on sink (unused in easy mode).
     * @type {{ row: number, col: number }[]}
     */
    this.unresolvedHits = [];
  }

  /**
   * Choose and execute the next shot.
   * @returns {{ row: number, col: number, result: 'miss'|'hit', ship: import('./Ship.js').default|null, sunk: boolean }}
   */
  takeTurn() {
    const { row, col } = this._chooseTarget();
    const outcome = this.enemyBoard.receiveAttack(row, col);

    this._removeFromHuntPool(row, col);

    if (this.difficulty === 'easy') {
      return { row, col, ...outcome };
    }

    if (outcome.result === 'hit') {
      this.unresolvedHits.push({ row, col });

      if (outcome.sunk) {
        this._onShipSunk(outcome.ship);
      } else {
        this._enqueueNeighbours(row, col);
      }
    }

    return { row, col, ...outcome };
  }

  // ---- Private helpers ----

  _buildHuntPool() {
    const pool = [];
    const size = this.enemyBoard.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.difficulty === 'easy' || (r + c) % 2 === 0) {
          pool.push({ row: r, col: c });
        }
      }
    }
    return this._shuffle(pool);
  }

  _shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  _removeFromHuntPool(row, col) {
    const idx = this.huntPool.findIndex((c) => c.row === row && c.col === col);
    if (idx !== -1) this.huntPool.splice(idx, 1);
  }

  _isValidTarget(row, col) {
    const size = this.enemyBoard.size;
    return (
      row >= 0 &&
      row < size &&
      col >= 0 &&
      col < size &&
      this.enemyBoard.attacks[row][col] === null
    );
  }

  _chooseTarget() {
    while (this.targetStack.length > 0) {
      const candidate = this.targetStack.pop();
      if (this._isValidTarget(candidate.row, candidate.col)) {
        return candidate;
      }
    }

    if (this.huntPool.length > 0) {
      return this.huntPool.pop();
    }

    // Fallback: pick any remaining un-attacked cell (shouldn't normally happen).
    const size = this.enemyBoard.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.enemyBoard.attacks[r][c] === null) {
          return { row: r, col: c };
        }
      }
    }

    throw new Error('No valid targets remain');
  }

  /**
   * After a hit, queue adjacent cells. If we already know the axis from
   * previous unresolved hits, only queue cells along that axis.
   */
  _enqueueNeighbours(row, col) {
    const axis = this._detectAxis();

    const directions =
      axis === 'horizontal'
        ? [DIRECTIONS[2], DIRECTIONS[3]]       // left, right
        : axis === 'vertical'
          ? [DIRECTIONS[0], DIRECTIONS[1]]     // up, down
          : DIRECTIONS;                        // all four

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (this._isValidTarget(nr, nc)) {
        this.targetStack.push({ row: nr, col: nc });
      }
    }
  }

  /**
   * Determine axis from two or more collinear unresolved hits.
   * @returns {'horizontal'|'vertical'|null}
   */
  _detectAxis() {
    if (this.unresolvedHits.length < 2) return null;

    const first = this.unresolvedHits[0];
    const last = this.unresolvedHits[this.unresolvedHits.length - 1];

    if (first.row === last.row) return 'horizontal';
    if (first.col === last.col) return 'vertical';
    return null;
  }

  /**
   * When a ship sinks, remove its cells from unresolvedHits and purge
   * any target-stack entries that were queued because of that ship.
   */
  _onShipSunk(ship) {
    const sunkCells = this.enemyBoard.getShipCells(ship);
    const sunkSet = new Set(sunkCells.map(([r, c]) => `${r},${c}`));

    this.unresolvedHits = this.unresolvedHits.filter(
      ({ row, col }) => !sunkSet.has(`${row},${col}`),
    );

    // Remove targets that are orthogonal neighbours of *only* sunk-ship cells.
    this.targetStack = this.targetStack.filter(({ row, col }) => {
      const isAdjacentToSunk = sunkCells.some(
        ([sr, sc]) => Math.abs(sr - row) + Math.abs(sc - col) === 1,
      );
      const isAdjacentToUnresolved = this.unresolvedHits.some(
        ({ row: ur, col: uc }) => Math.abs(ur - row) + Math.abs(uc - col) === 1,
      );
      return !isAdjacentToSunk || isAdjacentToUnresolved;
    });
  }
}
