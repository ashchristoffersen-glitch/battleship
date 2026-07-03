import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sinkShipCells } from '../js/ui/effects.js';

function createClassList() {
  const classes = new Set();
  return {
    add(...tokens) {
      tokens.forEach((token) => classes.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => classes.delete(token));
    },
    contains(token) {
      return classes.has(token);
    },
    toArray() {
      return [...classes];
    },
  };
}

function createCell() {
  return {
    classList: createClassList(),
    offsetWidth: 0,
  };
}

function createBoard(cells) {
  const cellMap = new Map();
  cells.forEach(([row, col]) => {
    cellMap.set(`${row},${col}`, createCell());
  });

  return {
    classList: createClassList(),
    offsetWidth: 0,
    querySelector(selector) {
      const match = selector.match(/data-row="(\d+)"\]\[data-col="(\d+)"/);
      if (!match) return null;
      return cellMap.get(`${match[1]},${match[2]}`) ?? null;
    },
    cellMap,
  };
}

test('sinkShipCells stages the sink animation over time', (t) => {
  t.mock.timers.enable();

  const board = createBoard([
    [0, 0],
    [0, 1],
    [0, 2],
  ]);

  sinkShipCells(board, [[0, 0], [0, 1], [0, 2]]);

  for (const cell of board.cellMap.values()) {
    assert.equal(cell.classList.contains('cell--sink-flash'), true);
    assert.equal(cell.classList.contains('cell--sink-settled'), false);
  }

  t.mock.timers.tick(180);
  assert.equal(board.cellMap.get('0,0').classList.contains('cell--sink-flash'), false);
  assert.equal(board.cellMap.get('0,0').classList.contains('cell--sink-settled'), true);
  assert.equal(board.cellMap.get('0,1').classList.contains('cell--sink-flash'), true);
  assert.equal(board.cellMap.get('0,2').classList.contains('cell--sink-flash'), true);

  t.mock.timers.tick(1000);

  for (const cell of board.cellMap.values()) {
    assert.equal(cell.classList.contains('cell--sink-flash'), false);
    assert.equal(cell.classList.contains('cell--sink-settled'), true);
  }
});
