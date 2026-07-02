import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Ship from '../js/game/Ship.js';
import Board from '../js/game/Board.js';
import Player from '../js/game/Player.js';
import AiPlayer from '../js/game/AiPlayer.js';
import GameController, { FLEET } from '../js/game/gameController.js';

// ===== Ship =====

describe('Ship', () => {
  it('starts with no hits', () => {
    const ship = new Ship('Destroyer', 2);
    assert.equal(ship.isSunk(), false);
    assert.deepEqual(ship.hits, [false, false]);
  });

  it('registers a hit at a valid index', () => {
    const ship = new Ship('Cruiser', 3);
    ship.hit(1);
    assert.deepEqual(ship.hits, [false, true, false]);
  });

  it('throws on out-of-range hit index', () => {
    const ship = new Ship('Destroyer', 2);
    assert.throws(() => ship.hit(-1), RangeError);
    assert.throws(() => ship.hit(2), RangeError);
  });

  it('is sunk when all cells are hit', () => {
    const ship = new Ship('Destroyer', 2);
    ship.hit(0);
    assert.equal(ship.isSunk(), false);
    ship.hit(1);
    assert.equal(ship.isSunk(), true);
  });
});

// ===== Board — placement validation =====

describe('Board placement', () => {
  it('places a ship horizontally within bounds', () => {
    const board = new Board();
    const ship = board.placeShip('Destroyer', 2, 0, 0, false);
    assert.equal(ship.name, 'Destroyer');
    assert.notEqual(board.grid[0][0], null);
    assert.notEqual(board.grid[0][1], null);
    assert.equal(board.grid[0][2], null);
  });

  it('places a ship vertically within bounds', () => {
    const board = new Board();
    board.placeShip('Cruiser', 3, 0, 0, true);
    assert.notEqual(board.grid[0][0], null);
    assert.notEqual(board.grid[1][0], null);
    assert.notEqual(board.grid[2][0], null);
    assert.equal(board.grid[3][0], null);
  });

  it('rejects placement that goes off the right edge', () => {
    const board = new Board();
    assert.equal(board.canPlaceShip(3, 0, 8, false), false);
    assert.throws(() => board.placeShip('Cruiser', 3, 0, 8, false));
  });

  it('rejects placement that goes off the bottom edge', () => {
    const board = new Board();
    assert.equal(board.canPlaceShip(3, 8, 0, true), false);
    assert.throws(() => board.placeShip('Cruiser', 3, 8, 0, true));
  });

  it('rejects placement that overlaps an existing ship', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    assert.equal(board.canPlaceShip(3, 0, 0, true), false);
    assert.throws(() => board.placeShip('Cruiser', 3, 0, 0, true));
  });

  it('allows placement adjacent to but not overlapping', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    assert.equal(board.canPlaceShip(2, 1, 0, false), true);
  });
});

// ===== Board — attack outcomes =====

describe('Board attacks', () => {
  it('records a miss on empty water', () => {
    const board = new Board();
    const result = board.receiveAttack(5, 5);
    assert.equal(result.result, 'miss');
    assert.equal(result.ship, null);
    assert.equal(result.sunk, false);
    assert.equal(board.attacks[5][5], 'miss');
  });

  it('records a hit on a ship cell', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    const result = board.receiveAttack(0, 0);
    assert.equal(result.result, 'hit');
    assert.notEqual(result.ship, null);
    assert.equal(result.ship.name, 'Destroyer');
    assert.equal(result.sunk, false);
    assert.equal(board.attacks[0][0], 'hit');
  });

  it('reports sunk when all cells of a ship are hit', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    board.receiveAttack(0, 0);
    const result = board.receiveAttack(0, 1);
    assert.equal(result.sunk, true);
    assert.equal(result.ship.isSunk(), true);
  });

  it('throws when attacking the same cell twice', () => {
    const board = new Board();
    board.receiveAttack(0, 0);
    assert.throws(() => board.receiveAttack(0, 0));
  });
});

// ===== Board — allSunk =====

describe('Board allSunk', () => {
  it('returns false when no ships are placed', () => {
    const board = new Board();
    assert.equal(board.allSunk(), false);
  });

  it('returns false when ships remain afloat', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    board.placeShip('Cruiser', 3, 2, 0, false);
    board.receiveAttack(0, 0);
    board.receiveAttack(0, 1);
    assert.equal(board.allSunk(), false);
  });

  it('returns true when every ship is sunk', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);
    board.receiveAttack(0, 0);
    board.receiveAttack(0, 1);
    assert.equal(board.allSunk(), true);
  });
});

// ===== Board — placeFleetRandomly (regression: no infinite loop) =====

describe('Board placeFleetRandomly', () => {
  it('places all fleet ships without throwing', () => {
    const board = new Board();
    board.placeFleetRandomly(FLEET);
    const totalCells = FLEET.reduce((sum, s) => sum + s.length, 0);
    let occupied = 0;
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        if (board.grid[r][c] !== null) occupied++;
      }
    }
    assert.equal(occupied, totalCells);
    assert.equal(board.ships.length, FLEET.length);
  });

  it('terminates and throws when no valid position exists', () => {
    const board = new Board();
    // Fill the board so nothing fits
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        board.grid[r][c] = { ship: new Ship('Filler', 1), index: 0 };
      }
    }
    assert.throws(
      () => board.placeFleetRandomly([{ name: 'Test', length: 2 }]),
      /No valid position/,
    );
  });

  it('uses _enumerateValidPositions internally (no while-retry)', () => {
    const board = new Board();
    assert.equal(typeof board._enumerateValidPositions, 'function');
    const positions = board._enumerateValidPositions(2);
    assert.ok(positions.length > 0);
    assert.ok(positions.every((p) => typeof p.row === 'number' && typeof p.col === 'number' && typeof p.vertical === 'boolean'));
  });
});

// ===== AiPlayer — normal mode: hunt and target =====

describe('AiPlayer (normal)', () => {
  it('starts in hunt mode with parity-filtered pool', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');
    assert.ok(ai.huntPool.length > 0);
    assert.ok(ai.huntPool.every(({ row, col }) => (row + col) % 2 === 0));
    assert.equal(ai.targetStack.length, 0);
  });

  it('enters target mode after a hit', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Destroyer', 2, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');

    // Force a hit by manipulating the hunt pool
    ai.huntPool = [{ row: 0, col: 0 }];
    ai.takeTurn();

    assert.ok(ai.targetStack.length > 0);
    assert.equal(ai.unresolvedHits.length, 1);
  });

  it('returns to hunt mode after sinking a ship', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Destroyer', 2, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');

    // Force hit on (0,0)
    ai.huntPool = [];
    ai.targetStack = [{ row: 0, col: 0 }];
    ai.takeTurn();
    assert.equal(ai.unresolvedHits.length, 1);

    // Force hit on (0,1) to sink the Destroyer
    ai.targetStack = [{ row: 0, col: 1 }];
    ai.takeTurn();

    // Ship is sunk, unresolvedHits should be cleared for that ship
    assert.equal(ai.unresolvedHits.length, 0);
  });

  it('uses axis locking with collinear hits', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Cruiser', 3, 0, 0, false); // horizontal at (0,0)-(0,2)
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');

    // Hit (0,0)
    ai.huntPool = [];
    ai.targetStack = [{ row: 0, col: 0 }];
    ai.takeTurn();

    // Hit (0,1) — now axis should be detected as horizontal
    ai.targetStack = [{ row: 0, col: 1 }];
    ai.takeTurn();

    // After two horizontal hits, targets should only be along horizontal axis
    const targets = ai.targetStack;
    targets.forEach(({ row }) => {
      assert.equal(row, 0, 'targets should be on row 0 (horizontal axis)');
    });
  });
});

// ===== AiPlayer — easy mode: no targeting =====

describe('AiPlayer (easy)', () => {
  it('has all cells in hunt pool (no parity filtering)', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    const ai = new AiPlayer(ownBoard, enemyBoard, 'easy');
    assert.equal(ai.huntPool.length, 100);
  });

  it('never uses targeting even after a hit', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Carrier', 5, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'easy');

    // Force a hit
    ai.huntPool = [{ row: 0, col: 0 }];
    ai.takeTurn();

    assert.equal(ai.targetStack.length, 0, 'easy mode should never add to targetStack');
    assert.equal(ai.unresolvedHits.length, 0, 'easy mode should never track unresolved hits');
  });

  it('fires 100 shots without error (exhaustive game)', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeFleetRandomly(FLEET);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'easy');

    for (let i = 0; i < 100; i++) {
      ai.takeTurn();
    }

    // Every cell should be attacked
    let attacked = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (enemyBoard.attacks[r][c] !== null) attacked++;
      }
    }
    assert.equal(attacked, 100);
    assert.equal(ai.targetStack.length, 0);
  });
});

// ===== GameController =====

describe('GameController', () => {
  it('starts in placement phase', () => {
    const gc = new GameController();
    assert.equal(gc.phase, 'placement');
  });

  it('accepts a difficulty parameter', () => {
    const gc = new GameController('easy');
    assert.equal(gc.difficulty, 'easy');
    assert.equal(gc.ai.difficulty, 'easy');
  });

  it('transitions to player-turn after startGame', () => {
    const gc = new GameController();
    gc.humanBoard.placeFleetRandomly(FLEET);
    gc.startGame();
    assert.equal(gc.phase, 'player-turn');
  });

  it('rejects humanAttack outside player-turn phase', () => {
    const gc = new GameController();
    const result = gc.humanAttack(0, 0);
    assert.equal(result, null);
  });

  it('rejects repeat attacks on the same AI board cell', () => {
    const gc = new GameController();
    gc.humanBoard.placeFleetRandomly(FLEET);
    gc.startGame();

    let row = -1;
    let col = -1;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (gc.aiBoard.grid[r][c] === null) {
          row = r;
          col = c;
          break;
        }
      }
      if (row !== -1) break;
    }

    assert.notEqual(row, -1);
    const firstOutcome = gc.humanAttack(row, col);
    assert.equal(firstOutcome.result, 'miss');
    assert.equal(gc.phase, 'ai-turn');

    gc.aiAttack();
    assert.equal(gc.phase, 'player-turn');
    assert.equal(gc.aiBoard.attacks[row][col], 'miss');

    const repeatOutcome = gc.humanAttack(row, col);
    assert.equal(repeatOutcome, null);
    assert.equal(gc.aiBoard.attacks[row][col], 'miss');
  });

  it('full game loop ends in game-over', () => {
    const gc = new GameController();
    gc.humanBoard.placeFleetRandomly(FLEET);
    gc.startGame();

    // Play until game over
    let turns = 0;
    while (gc.phase !== 'game-over' && turns < 200) {
      if (gc.phase === 'player-turn') {
        // Find an un-attacked cell on AI board
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            if (gc.aiBoard.attacks[r][c] === null) {
              gc.humanAttack(r, c);
              r = 10; c = 10; // break nested loops
            }
          }
        }
      }
      if (gc.phase === 'ai-turn') {
        gc.aiAttack();
      }
      turns++;
    }

    assert.equal(gc.phase, 'game-over');
    assert.ok(gc.winner === 'human' || gc.winner === 'ai');
  });

  it('reset restores placement phase and optionally changes difficulty', () => {
    const gc = new GameController('normal');
    gc.humanBoard.placeFleetRandomly(FLEET);
    gc.startGame();
    gc.reset('easy');
    assert.equal(gc.phase, 'placement');
    assert.equal(gc.difficulty, 'easy');
    assert.equal(gc.ai.difficulty, 'easy');
    assert.equal(gc.aiBoard.ships.length, 0);
  });
});
