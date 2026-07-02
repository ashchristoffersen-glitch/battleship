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

**Timing matters:** use a per-shot delay LONGER than the AI turn delay (`AI_TURN_DELAY_MS`, currently 600ms) — e.g. 750ms. A shorter delay (e.g. 300ms) fires clicks during the AI's turn (phase `ai-turn`), where they are ignored, leaving cells un-fired so the game never completes in one pass. If some enemy cells remain after a run, just re-run `ap()` — it skips already hit/miss cells.

## Game Over Flow

The game-over overlay contains two buttons:
- **"Play Again"**: resets to placement phase, same difficulty (no difficulty screen)
- **"New Game"**: returns to difficulty selection screen, hides game boards

There is also a "New Game" button in the footer (visible after game-over) for the same action.

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
11. **New Game from overlay**: click "New Game" in the game-over overlay → difficulty screen appears, boards hidden
12. **Boards hidden on difficulty screen**: after clicking "New Game", verify `<main class="game">` has `hidden` attribute and is not visible
13. **How-to-play instructions**: on the difficulty screen, verify the `.difficulty-screen__howto` paragraph sits between the "Choose Difficulty" heading and the difficulty buttons (reading order: heading → how to play → buttons). It reads as body copy (not fine print) with a constrained max-width so lines don't stretch across a desktop. On a narrow phone viewport (≤480px), the third sentence (`.difficulty-screen__howto-extra` — "Hits are red, misses are grey.") is hidden, and the heading, instructions, and both buttons all fit on one screen without scrolling.

## Repeat-Fire Feedback (issue #5)

Clicking an enemy cell that was already fired at (hit or miss) shows the message "You already fired at that square." — the cell state is unchanged and no AI turn is triggered. To test: fire at a cell, wait for the AI response, then click the SAME cell again and verify the message.

## Scoreboard Persistence (issue #6)

The footer scoreboard (`Wins`/`Losses`) is persisted to `localStorage` (key `battleship-scoreboard` via `js/game/Scoreboard.js`):
- **Refresh** the page → scoreboard is preserved (NOT reset to 0-0).
- **Play Again** (overlay or after game-over) → scoreboard keeps its running count.
- **New Game** (overlay/footer button → difficulty screen) → scoreboard resets to 0-0.

To test cleanly, reach game-over so the score is non-zero, then exercise refresh / Play Again / New Game and check the footer count each time. `localStorage` persists between reloads, so clear it (or click New Game) between unrelated test runs to start from 0-0.

## Tips

- Console multi-line paste often breaks in Chrome devtools during automated testing. Write single-line scripts instead.
- The AI delay is 600ms per turn (`AI_TURN_DELAY_MS`). Factor this into auto-play timing.
- Opening/closing Chrome devtools (F12) reflows the page and re-centers the game-over overlay, so button coordinates shift. Click overlay buttons (Play Again / New Game) either before opening devtools or after re-locating them in a fresh screenshot — otherwise the click lands on empty space and the overlay stays up.

## Devin Secrets Needed

None. The app is fully static with no backend or authentication.
