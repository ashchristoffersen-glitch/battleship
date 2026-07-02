const COLUMN_LABELS = 'ABCDEFGHIJ';

/**
 * Create a board grid element with labelled axes.
 * @param {string} id - DOM id for the grid container.
 * @param {number} size - Board dimension (10).
 * @param {(row: number, col: number) => void} [onCellClick] - Click handler.
 * @returns {HTMLElement}
 */
export function createBoardElement(id, size, onCellClick) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('board');
  wrapper.id = id;

  // Column headers row
  const headerRow = document.createElement('div');
  headerRow.classList.add('board-row', 'header-row');
  headerRow.appendChild(createLabel(''));
  for (let c = 0; c < size; c++) {
    headerRow.appendChild(createLabel(COLUMN_LABELS[c]));
  }
  wrapper.appendChild(headerRow);

  // Data rows
  for (let r = 0; r < size; r++) {
    const row = document.createElement('div');
    row.classList.add('board-row');
    row.appendChild(createLabel(String(r + 1)));

    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (onCellClick) {
        cell.addEventListener('click', () => onCellClick(r, c));
      }

      row.appendChild(cell);
    }
    wrapper.appendChild(row);
  }

  return wrapper;
}

/**
 * Refresh the visual state of every cell in a board element.
 * @param {HTMLElement} boardEl
 * @param {import('../game/Board.js').default} board
 * @param {object} options
 * @param {boolean} options.showShips - Whether to reveal un-hit ship cells.
 * @param {boolean} [options.gameOver] - Reveal all ships on game end.
 */
export function renderBoard(boardEl, board, { showShips, gameOver = false }) {
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach((cell) => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const attack = board.attacks[r][c];
    const occupied = board.grid[r][c] !== null;

    cell.className = 'cell';

    if (attack === 'hit') {
      cell.classList.add('hit');
    } else if (attack === 'miss') {
      cell.classList.add('miss');
    } else if (showShips && occupied) {
      cell.classList.add('ship');
    }

    if (gameOver && occupied && attack !== 'hit') {
      cell.classList.add('ship-reveal');
    }

    const gridCell = board.grid[r][c];
    if (gridCell && gridCell.ship.isSunk() && attack === 'hit') {
      cell.classList.add('sunk');
    }
  });
}

function createLabel(text) {
  const el = document.createElement('div');
  el.classList.add('cell-label');
  el.textContent = text;
  return el;
}
