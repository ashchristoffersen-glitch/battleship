import GameController from './game/gameController.js';
import { createBoardElement, renderBoard } from './ui/boardRenderer.js';
import { init as initMessage, show as showMessage } from './ui/messageDisplay.js';
import { initPlacement } from './ui/dragAndDrop.js';

const AI_TURN_DELAY_MS = 600;

const game = new GameController();
let humanBoardEl;
let aiBoardEl;
let wins = 0;
let losses = 0;

function init() {
  const messageEl = document.getElementById('message');
  const humanContainer = document.getElementById('human-board');
  const aiContainer = document.getElementById('ai-board');
  const dockEl = document.getElementById('dock');
  const newGameBtn = document.getElementById('new-game-btn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayBtn = document.getElementById('overlay-btn');

  initMessage(messageEl);

  function setupBoards() {
    humanContainer.innerHTML = '';
    aiContainer.innerHTML = '';

    humanBoardEl = createBoardElement('human-board', game.humanBoard.size);
    aiBoardEl = createBoardElement('ai-board', game.aiBoard.size, onAiCellClick);

    humanContainer.appendChild(humanBoardEl);
    aiContainer.appendChild(aiBoardEl);
  }

  function startPlacement() {
    setupBoards();
    overlay.hidden = true;
    newGameBtn.hidden = true;
    dockEl.hidden = false;
    showMessage('Place your ships on the board.', 'info');
    initPlacement(game.humanBoard, humanBoardEl, dockEl, onAllShipsPlaced);
  }

  function onAllShipsPlaced() {
    dockEl.hidden = true;
    game.startGame();
    showMessage('All ships placed! Fire at the enemy board.', 'success', 3000);
    renderBoards();
  }

  function onAiCellClick(row, col) {
    if (game.phase !== 'player-turn') return;

    const outcome = game.humanAttack(row, col);
    if (!outcome) return;

    renderBoards();
    announceAttack('You', outcome);

    if (game.phase === 'game-over') {
      onGameOver();
      return;
    }

    // AI responds after a short delay
    setTimeout(() => {
      const aiOutcome = game.aiAttack();
      if (!aiOutcome) return;

      renderBoards();
      announceAttack('Computer', aiOutcome);

      if (game.phase === 'game-over') {
        onGameOver();
      }
    }, AI_TURN_DELAY_MS);
  }

  function announceAttack(attacker, { result, ship, sunk }) {
    if (sunk) {
      showMessage(`${attacker} sunk the ${ship.name}!`, 'danger');
    } else if (result === 'hit') {
      showMessage(`${attacker}: Hit!`, 'success', 2000);
    } else {
      showMessage(`${attacker}: Miss.`, 'info', 2000);
    }
  }

  function renderBoards() {
    const isOver = game.phase === 'game-over';
    renderBoard(humanBoardEl, game.humanBoard, { showShips: true, gameOver: isOver });
    renderBoard(aiBoardEl, game.aiBoard, { showShips: false, gameOver: isOver });
  }

  function onGameOver() {
    renderBoards();

    if (game.winner === 'human') {
      wins++;
      overlayTitle.textContent = 'Victory!';
      overlayText.textContent = 'You destroyed the enemy fleet.';
    } else {
      losses++;
      overlayTitle.textContent = 'Defeat';
      overlayText.textContent = 'The computer sank your fleet.';
    }

    document.getElementById('wins').textContent = wins;
    document.getElementById('losses').textContent = losses;

    overlay.hidden = false;
    newGameBtn.hidden = false;
  }

  function resetGame() {
    game.reset();
    startPlacement();
  }

  overlayBtn.addEventListener('click', resetGame);
  newGameBtn.addEventListener('click', resetGame);

  startPlacement();
}

document.addEventListener('DOMContentLoaded', init);
