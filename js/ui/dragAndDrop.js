import { FLEET } from '../game/gameController.js';
import { show as showMessage } from './messageDisplay.js';

/**
 * Manages drag-and-drop (and touch-drag) ship placement onto the human board.
 *
 * @param {import('../game/Board.js').default} board
 * @param {HTMLElement} boardEl
 * @param {HTMLElement} dockEl   - Container holding draggable ship pieces.
 * @param {() => void} onAllPlaced - Called when every ship has been placed.
 */
export function initPlacement(board, boardEl, dockEl, onAllPlaced) {
  const shipStates = FLEET.map((def) => ({
    ...def,
    vertical: false,
    placed: false,
    el: null,
  }));

  buildDock(dockEl, shipStates, board, boardEl, onAllPlaced);
}

export function exceedsDragThreshold(dx, dy, threshold = 10) {
  return Math.hypot(dx, dy) > threshold;
}

// ---- Dock rendering ----

function buildDock(dockEl, shipStates, board, boardEl, onAllPlaced) {
  dockEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Place Your Ships';
  heading.classList.add('dock-heading');
  dockEl.appendChild(heading);

  const rotateHint = document.createElement('p');
  rotateHint.classList.add('dock-hint', 'dock-hint--rotate');
  rotateHint.textContent = 'Click a ship to rotate';
  dockEl.appendChild(rotateHint);

  const hint = document.createElement('p');
  hint.classList.add('dock-hint');
  hint.textContent = 'Drag ships onto your board.';
  dockEl.appendChild(hint);

  const shipList = document.createElement('div');
  shipList.classList.add('ship-list');

  shipStates.forEach((state) => {
    if (state.placed) return;

    const piece = document.createElement('div');
    piece.classList.add('ship-piece');
    piece.setAttribute('draggable', 'true');
    piece.dataset.name = state.name;
    piece.dataset.length = state.length;
    piece.title = `${state.name} (${state.length})`;
    state.el = piece;

    renderPiece(piece, state);

    // Click to rotate
    piece.addEventListener('click', () => {
      if (Date.now() < suppressClickUntil) return;
      state.vertical = !state.vertical;
      renderPiece(piece, state);
    });

    // Desktop drag
    piece.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', state.name);
      e.dataTransfer.effectAllowed = 'move';
    });

    // Touch drag support
    const DRAG_THRESHOLD = 10;
    let touchClone = null;
    let dragging = false;
    let suppressClickUntil = 0;
    let startX = 0;
    let startY = 0;

    function createTouchClone(touch) {
      if (touchClone) return;

      touchClone = piece.cloneNode(true);
      touchClone.classList.add('ship-piece--dragging');
      touchClone.style.position = 'fixed';
      touchClone.style.pointerEvents = 'none';
      touchClone.style.zIndex = '1000';
      touchClone.style.opacity = '0.8';
      positionTouchClone(touchClone, touch);
      document.body.appendChild(touchClone);
    }

    function clearTouchDrag() {
      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }
      clearHighlights(boardEl);
      dragging = false;
    }

    piece.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragging = false;
      touchClone = null;
    }, { passive: true });

    piece.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!dragging && !exceedsDragThreshold(dx, dy, DRAG_THRESHOLD)) {
        return;
      }

      if (!dragging) {
        dragging = true;
        createTouchClone(touch);
      }

      e.preventDefault();
      if (touchClone) positionTouchClone(touchClone, touch);
      highlightDropTarget(boardEl, touch, state.length, state.vertical);
    }, { passive: false });

    piece.addEventListener('touchend', (e) => {
      suppressClickUntil = Date.now() + 700;
      const touch = e.changedTouches[0];
      const wasDragging = dragging;

      if (!wasDragging) {
        state.vertical = !state.vertical;
        renderPiece(piece, state);
        clearTouchDrag();
        return;
      }

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      clearTouchDrag();

      if (target && target.classList.contains('cell') && target.closest('#human-board')) {
        const row = Number(target.dataset.row);
        const col = Number(target.dataset.col);
        attemptPlace(board, state, row, col, boardEl, dockEl, shipStates, onAllPlaced);
      }
    }, { passive: false });

    piece.addEventListener('touchcancel', () => {
      clearTouchDrag();
    }, { passive: true });

    shipList.appendChild(piece);
  });

  dockEl.appendChild(shipList);

  // Randomise button
  const randomBtn = document.createElement('button');
  randomBtn.textContent = 'Randomise';
  randomBtn.classList.add('btn', 'btn--secondary');
  randomBtn.addEventListener('click', () => {
    randomiseAll(board, shipStates, boardEl, dockEl, onAllPlaced);
  });
  dockEl.appendChild(randomBtn);

  // Board drop handling (desktop)
  setupDesktopDrop(boardEl, board, shipStates, dockEl, onAllPlaced);
}

function renderPiece(el, state) {
  el.innerHTML = '';
  el.classList.toggle('vertical', state.vertical);

  for (let i = 0; i < state.length; i++) {
    const seg = document.createElement('div');
    seg.classList.add('ship-segment');
    el.appendChild(seg);
  }

  const label = document.createElement('span');
  label.classList.add('ship-piece-label');
  label.textContent = state.name;
  el.appendChild(label);
}

// ---- Desktop drop ----

function setupDesktopDrop(boardEl, board, shipStates, dockEl, onAllPlaced) {
  boardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  boardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');
    const state = shipStates.find((s) => s.name === name);
    if (!state || state.placed) return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    attemptPlace(board, state, row, col, boardEl, dockEl, shipStates, onAllPlaced);
  });
}

// ---- Touch helpers ----

function positionTouchClone(clone, touch) {
  clone.style.left = `${touch.clientX - 20}px`;
  clone.style.top = `${touch.clientY - 20}px`;
}

function highlightDropTarget(boardEl, touch, length, vertical) {
  clearHighlights(boardEl);
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!target || !target.classList.contains('cell')) return;

  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  for (let i = 0; i < length; i++) {
    const r = vertical ? row + i : row;
    const c = vertical ? col : col + i;
    const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) cell.classList.add('drop-preview');
  }
}

function clearHighlights(boardEl) {
  boardEl.querySelectorAll('.drop-preview').forEach((c) => c.classList.remove('drop-preview'));
}

// ---- Placement logic ----

function attemptPlace(board, state, row, col, boardEl, dockEl, shipStates, onAllPlaced) {
  if (!board.canPlaceShip(state.length, row, col, state.vertical)) {
    flashInvalid(boardEl, row, col, state.length, state.vertical, board);
    return;
  }

  board.placeShip(state.name, state.length, row, col, state.vertical);
  state.placed = true;

  renderPlacedShip(boardEl, row, col, state.length, state.vertical);

  if (shipStates.every((s) => s.placed)) {
    dockEl.innerHTML = '';
    onAllPlaced();
  } else {
    buildDock(dockEl, shipStates, board, boardEl, onAllPlaced);
  }
}

function flashInvalid(boardEl, row, col, length, vertical, board) {
  const cells = [];
  let outOfBounds = false;
  let overlapping = false;

  for (let i = 0; i < length; i++) {
    const r = vertical ? row + i : row;
    const c = vertical ? col : col + i;
    if (r < 0 || r >= board.size || c < 0 || c >= board.size) {
      outOfBounds = true;
      continue;
    }
    const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cells.push(cell);
      if (board.grid[r][c] !== null) overlapping = true;
    }
  }

  cells.forEach((cell) => {
    cell.classList.add('placement-invalid');
    cell.addEventListener('animationend', () => {
      cell.classList.remove('placement-invalid');
    }, { once: true });
  });

  if (overlapping) {
    showMessage('Can\u2019t place there \u2014 overlapping another ship.', 'danger', 2000);
  } else if (outOfBounds) {
    showMessage('Can\u2019t place there \u2014 ship goes off the board.', 'danger', 2000);
  } else {
    showMessage('Can\u2019t place there.', 'danger', 2000);
  }
}

function renderPlacedShip(boardEl, row, col, length, vertical) {
  for (let i = 0; i < length; i++) {
    const r = vertical ? row + i : row;
    const c = vertical ? col : col + i;
    const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) cell.classList.add('ship');
  }
}

function randomiseAll(board, shipStates, boardEl, dockEl, onAllPlaced) {
  // Clear existing placements
  const freshBoard = board;
  for (let r = 0; r < freshBoard.size; r++) {
    for (let c = 0; c < freshBoard.size; c++) {
      freshBoard.grid[r][c] = null;
    }
  }
  freshBoard.ships = [];

  shipStates.forEach((s) => {
    s.placed = false;
    s.vertical = false;
  });

  // Clear board UI
  boardEl.querySelectorAll('.cell').forEach((c) => c.classList.remove('ship'));

  // Place all randomly
  const fleet = shipStates.map(({ name, length }) => ({ name, length }));
  freshBoard.placeFleetRandomly(fleet);
  shipStates.forEach((s) => (s.placed = true));

  // Render all placed ships
  freshBoard.ships.forEach((ship) => {
    const cells = freshBoard.getShipCells(ship);
    cells.forEach(([r, c]) => {
      const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cell) cell.classList.add('ship');
    });
  });

  dockEl.innerHTML = '';
  onAllPlaced();
}
