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

## Difficulty Selection

The app starts with a difficulty selection screen ("Choose Difficulty") before placement.
- **Easy**: AI fires at random cells — no hunt/target behavior after hits.
- **Normal**: AI uses parity-filtered hunt pool and targets adjacent cells after hits.

To test difficulty behavior:
1. Select Easy, place ships, play several turns. After AI hits your ship, verify the NEXT AI shot is NOT adjacent to the hit (random).
2. Select Normal, place ships, play several turns. After AI hits your ship, verify the NEXT AI shot IS adjacent to the hit (targeting).

## Invalid Placement Feedback

When a ship is dropped on an invalid position:
- Overlap: message "Can't place there — overlapping another ship." with danger styling
- Out of bounds: "Can't place there — ship goes off the board." with danger styling
- Cells flash with `.placement-invalid` class (red + shake animation)
- Ship remains in dock (not placed)

To test: place one ship, then attempt to place a second ship overlapping via the DragEvent console approach.

## ARIA Labels

Board cells have dynamic `aria-label` attributes:
- Empty: `"A1, empty"`
- Hit: `"F8, hit"`
- Miss: `"B6, miss"`
- Ship (human board): `"C1, ship"`
- Sunk: includes ship name, e.g. `"D4, sunk, Carrier"`

Board wrapper has `role="grid"` and `aria-label="Your fleet grid"` / `"Enemy waters grid"`.

Verify via console: `document.querySelector('#human-board .cell.hit')?.getAttribute('aria-label')`

## Auto-Play Script for Rapid Game Completion

To quickly reach game-over state (e.g. to test New Game / Play Again buttons):

```javascript
async function ap(){const rows=document.querySelectorAll('#ai-board .board .board-row');for(let r=1;r<=10;r++){for(let c=0;c<10;c++){const cell=rows[r]?.querySelectorAll('.cell')[c];if(cell&&!cell.classList.contains('hit')&&!cell.classList.contains('miss')){cell.click();await new Promise(res=>setTimeout(res,800))}}}}ap()
```

This must be run as a single line in the console (multi-line paste causes syntax errors). Takes ~40-80 seconds depending on ship locations.

## Game Over Flow

- **"Play Again"** (overlay button): resets to placement phase, same difficulty (no difficulty screen)
- **"New Game"** (footer button): returns to difficulty selection screen

Note: The overlay blocks clicks on the "New Game" footer button. Use `document.querySelector('footer button').click()` via console to bypass, or dismiss the overlay with "Play Again" first.

## Standard Test Cases

1. **Difficulty screen**: verify heading, Easy/Normal buttons with icons and descriptions
2. **Randomise placement**: click Randomise, verify 17 `.ship` cells on human board
3. **Manual placement**: click ship to rotate (verify `.vertical` class), drag to board
4. **Invalid placement**: overlap and OOB scenarios with error messages
5. **Gameplay loop**: fire at enemy board, verify hit/miss classes and AI response
6. **AI behavior difference**: Easy (random after hit) vs Normal (adjacent after hit)
7. **Sinking**: hit all cells of a ship, verify `.sunk` class (dark red)
8. **Game over**: sink all enemy ships, verify overlay text and scoreboard
9. **Play Again vs New Game**: verify correct flow for each button
10. **ARIA labels**: inspect aria-label attributes during gameplay

## Tips

- The game-over overlay intercepts clicks on the footer "New Game" button. Use console JS to click it: `document.querySelector('footer button').click()`
- Console multi-line paste often breaks in Chrome devtools during automated testing. Write single-line scripts instead.
- After "New Game", game boards remain visible below the difficulty screen with old state. This is cosmetic — the core flow works.
- The AI delay is 600ms per turn (`AI_TURN_DELAY_MS`). Factor this into auto-play timing.

## Devin Secrets Needed

None. The app is fully static with no backend or authentication.
