function restartClass(node, className, duration) {
  if (!node) return;

  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  window.setTimeout(() => {
    node.classList.remove(className);
  }, duration);
}

function getCell(boardEl, row, col) {
  return boardEl?.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

export function impactCell(boardEl, row, col) {
  restartClass(getCell(boardEl, row, col), 'cell--impact', 320);
}

export function sinkShipCells(boardEl, cells) {
  cells.forEach(([row, col]) => {
    restartClass(getCell(boardEl, row, col), 'cell--sink', 1000);
  });
}

const sinkOverlayTimers = new WeakMap();

export function shakeHumanBoard(boardEl) {
  restartClass(boardEl, 'board--hit-shake', 420);
}

export function screenShake() {
  restartClass(document.body, 'screen-shake', 520);
}

export function ensureHitOverlay(container) {
  if (!container) return null;

  let overlay = container.querySelector('.board-hit-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'board-hit-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = 'HIT';
    container.appendChild(overlay);
  }

  return overlay;
}

export function showHitOverlay(container) {
  const overlay = ensureHitOverlay(container);
  if (!overlay) return;

  restartClass(overlay, 'is-visible', 520);
}

export function ensureSinkOverlay(container) {
  if (!container) return null;

  let overlay = container.querySelector('.board-sink-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'board-sink-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    container.appendChild(overlay);
  }

  return overlay;
}

export function showSinkOverlay(container, text) {
  const overlay = ensureSinkOverlay(container);
  if (!overlay) return;

  const existing = sinkOverlayTimers.get(overlay);
  if (existing) {
    clearTimeout(existing.show);
    clearTimeout(existing.hide);
  }

  overlay.textContent = text;
  overlay.classList.remove('is-visible');
  void overlay.offsetWidth;

  const show = window.setTimeout(() => {
    overlay.classList.add('is-visible');
  }, 1000);

  const hide = window.setTimeout(() => {
    overlay.classList.remove('is-visible');
  }, 2500);

  sinkOverlayTimers.set(overlay, { show, hide });
}
