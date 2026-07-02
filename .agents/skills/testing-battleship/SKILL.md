---
name: testing-battleship
description: Test the Battleship browser game end-to-end. Use when verifying gameplay, ship placement, AI behavior, or UI changes.
---

# Testing the Battleship Game

## Local Dev Setup

The app is pure static HTML/CSS/JS with no dependencies or build step.

```bash
cd /path/to/battleship
python3 -m http.server 8080 &
```

Then open `http://localhost:8080` in Chrome.

## Architecture Notes

- Game logic is in `js/game/` (Ship, Board, Player, AiPlayer, gameController) — no DOM access.
- UI rendering is in `js/ui/` (boardRenderer, dragAndDrop, messageDisplay) — reads game state, renders DOM.
- `js/main.js` wires them together. The `game` object is scoped inside `init()` and not accessible from the console by default.
- To inspect game state during testing, temporarily add `window._game = game;` after `const game = new GameController();` in main.js, then reload.

## Key CSS Classes to Verify

| State | CSS Class | Visual |
|-------|-----------|--------|
| Ship (human board) | `.ship` | Blue cell |
| Hit | `.hit` | Red cell with X pseudo-element |
| Miss | `.miss` | Grey cell with dot pseudo-element |
| Sunk | `.sunk` | Dark red cell |
| Revealed (game over) | `.ship-reveal` | Faded blue |
| Drop preview | `.drop-preview` | Semi-transparent blue |

## Testing Drag-and-Drop

HTML5 drag-and-drop does not work reliably with automated desktop tools (e.g. computer use). To test placement programmatically:

```javascript
const shipPiece = document.querySelector('.ship-piece[data-name="Carrier"]');
const targetCell = document.querySelector('#human-board .cell[data-row="0"][data-col="0"]');
const dragStartEvent = new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() });
dragStartEvent.dataTransfer.setData('text/plain', 'Carrier');
shipPiece.dispatchEvent(dragStartEvent);
const dragOverEvent = new DragEvent('dragover', { bubbles: true, dataTransfer: dragStartEvent.dataTransfer });
targetCell.dispatchEvent(dragOverEvent);
const dropEvent = new DragEvent('drop', { bubbles: true, dataTransfer: dragStartEvent.dataTransfer });
targetCell.dispatchEvent(dropEvent);
```

Click-to-rotate works natively via computer use clicks on the ship pieces in the dock.

## Accelerating Game-Over Testing

To test victory/defeat without clicking every cell:
1. Expose the game object (see above)
2. Use `window._game.aiBoard.grid` to find enemy ship locations
3. Click each enemy ship cell on the AI board via UI clicks (NOT programmatic `humanAttack()` — that bypasses the UI render cycle and gets stuck in `ai-turn` phase)

## Standard Test Cases

1. **Randomise placement**: click Randomise, verify 17 `.ship` cells on human board
2. **Manual placement**: click ship to rotate (verify `.vertical` class), drag to board
3. **Gameplay loop**: fire at enemy board, verify hit/miss classes and AI response
4. **Sinking**: hit all cells of a ship, verify `.sunk` class (dark red)
5. **Game over**: sink all enemy ships, verify overlay text and scoreboard
6. **Reset**: click Play Again, verify boards cleared and dock reappears

## Devin Secrets Needed

None. The app is fully static with no backend or authentication.
