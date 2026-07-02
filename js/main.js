import GameController from './game/gameController.js';
import Scoreboard from './game/Scoreboard.js';
import { createBoardElement, renderBoard } from './ui/boardRenderer.js';
import { init as initMessage, show as showMessage } from './ui/messageDisplay.js';
import { initPlacement } from './ui/dragAndDrop.js';
import {
  ensureHitOverlay,
  ensureSinkOverlay,
  impactCell,
  screenShake,
  shakeHumanBoard,
  showHitOverlay,
  showSinkOverlay,
  sinkShipCells,
} from './ui/effects.js';
import {
  isMuted,
  playHit,
  playIncomingHit,
  playMiss,
  playSinkEnemy,
  playSinkPlayer,
  resume,
  toggleMuted,
} from './ui/sound.js';

const AI_TURN_DELAY_MS = 600;

let game = null;
let humanBoardEl;
let aiBoardEl;
let humanBoardContainerEl;
let aiBoardContainerEl;

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
  const diffScreen = document.getElementById('difficulty-screen');
  const gameMain = document.querySelector('.game');
  const winsEl = document.getElementById('wins');
  const lossesEl = document.getElementById('losses');
  const muteBtn = document.getElementById('mute-btn');

  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }

  const scoreboard = new Scoreboard(storage);

  initMessage(messageEl);

  function syncMuteButton() {
    const muted = isMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }

  function renderScores() {
    winsEl.textContent = scoreboard.wins;
    lossesEl.textContent = scoreboard.losses;
  }

  function resumeAudio() {
    void resume();
  }

  function remainingShips(board) {
    return board.ships.filter((ship) => !ship.isSunk()).length;
  }

  function setupBoards() {
    humanContainer.innerHTML = '';
    aiContainer.innerHTML = '';

    humanBoardContainerEl = humanContainer;
    aiBoardContainerEl = aiContainer;
    humanBoardEl = createBoardElement('human-board', game.humanBoard.size);
    aiBoardEl = createBoardElement('ai-board', game.aiBoard.size, onAiCellClick);

    humanContainer.appendChild(humanBoardEl);
    ensureHitOverlay(humanContainer);
    ensureSinkOverlay(humanContainer);
    aiContainer.appendChild(aiBoardEl);
    ensureHitOverlay(aiContainer);
    ensureSinkOverlay(aiContainer);
  }

  function showDifficultyScreen() {
    diffScreen.hidden = false;
    gameMain.hidden = true;
    overlay.hidden = true;
    newGameBtn.hidden = true;
    showMessage('', 'info');
  }

  function onDifficultyChosen(difficulty) {
    resumeAudio();
    game = new GameController(difficulty);
    diffScreen.hidden = true;
    gameMain.hidden = false;
    startPlacement();
  }

  document.getElementById('diff-easy').addEventListener('click', () => onDifficultyChosen('easy'));
  document.getElementById('diff-normal').addEventListener('click', () => onDifficultyChosen('normal'));
  muteBtn.addEventListener('click', () => {
    toggleMuted();
    syncMuteButton();
    if (!isMuted()) resumeAudio();
  });

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
    if (game.aiBoard.attacks[row][col] !== null) {
      showMessage('You already fired at that square.', 'info', 2000);
      return;
    }

    resumeAudio();
    const outcome = game.humanAttack(row, col);
    if (!outcome) return;

    renderBoards();
    handleHumanAttackFeedback(row, col, outcome);

    if (game.phase === 'game-over') {
      onGameOver();
      return;
    }

    // AI responds after a short delay
    setTimeout(() => {
      const aiOutcome = game.aiAttack();
      if (!aiOutcome) return;

      renderBoards();
      handleAiAttackFeedback(aiOutcome);

      if (game.phase === 'game-over') {
        onGameOver();
      }
    }, AI_TURN_DELAY_MS);
  }

  function handleHumanAttackFeedback(row, col, outcome) {
    if (outcome.sunk) {
      const message = `You sank their ${outcome.ship.name}! ${remainingShips(game.aiBoard)} ships to go.`;
      playSinkEnemy();
      sinkShipCells(aiBoardEl, game.aiBoard.getShipCells(outcome.ship));
      showSinkOverlay(aiBoardContainerEl, message);
      showMessage(message, 'danger');
      return;
    }

    if (outcome.result === 'hit') {
      playHit();
      impactCell(aiBoardEl, row, col);
      showMessage('You: Hit!', 'success', 2000);
      return;
    }

    playMiss();
    showMessage('You: Miss.', 'info', 2000);
  }

  function handleAiAttackFeedback(aiOutcome) {
    if (aiOutcome.sunk) {
      const message = `They sank your ${aiOutcome.ship.name}! ${remainingShips(game.humanBoard)} of your ships remain.`;
      playSinkPlayer();
      screenShake();
      shakeHumanBoard(humanBoardEl);
      sinkShipCells(humanBoardEl, game.humanBoard.getShipCells(aiOutcome.ship));
      showSinkOverlay(humanBoardContainerEl, message);
      showMessage(message, 'danger');
      return;
    }

    if (aiOutcome.result === 'hit') {
      playIncomingHit();
      shakeHumanBoard(humanBoardEl);
      showHitOverlay(humanBoardContainerEl);
      showMessage('Computer: Hit!', 'success', 2000);
      return;
    }

    playMiss();
    showMessage('Computer: Miss.', 'info', 2000);
  }

  function renderBoards() {
    const isOver = game.phase === 'game-over';
    renderBoard(humanBoardEl, game.humanBoard, { showShips: true, gameOver: isOver });
    renderBoard(aiBoardEl, game.aiBoard, { showShips: false, gameOver: isOver });
  }

  function onGameOver() {
    if (game.winner === 'human') {
      scoreboard.recordWin();
      overlayTitle.textContent = 'Victory!';
      overlayText.textContent = 'You destroyed the enemy fleet.';
    } else {
      scoreboard.recordLoss();
      overlayTitle.textContent = 'Defeat';
      overlayText.textContent = 'The computer sank your fleet.';
    }

    renderScores();

    overlay.hidden = false;
    newGameBtn.hidden = false;
  }

  function resetGame() {
    game.reset();
    startPlacement();
  }

  function changeDifficulty() {
    scoreboard.reset();
    renderScores();
    showDifficultyScreen();
  }

  const overlayNewGameBtn = document.getElementById('overlay-new-game-btn');

  overlayBtn.addEventListener('click', resetGame);
  overlayNewGameBtn.addEventListener('click', changeDifficulty);
  newGameBtn.addEventListener('click', changeDifficulty);

  syncMuteButton();
  showDifficultyScreen();
}

document.addEventListener('DOMContentLoaded', init);
