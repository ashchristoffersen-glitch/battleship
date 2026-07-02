# Bug Log

A factual record of every bug found and fixed across all sessions on this project.

---

## Bug 1: Git push 403 — Devin proxy lacked repo access

**What:** Initial `git push` to `github.com/ashchristoffersen-glitch/battleship` failed with HTTP 403.

**How discovered:** First attempted push after building the game locally.

**Root cause:** The Devin git proxy authenticates via a GitHub integration that must explicitly include the target repository. The `battleship` repo had just been created and was not yet added to the integration's allowed-repository list.

**Fix:** The repo owner connected the `battleship` repository to the Devin GitHub integration at the org settings page. Subsequent pushes succeeded.

**Verified:** `git push origin devin/1751414400-battleship-game` completed with no errors.

---

## Bug 2: PR base branch did not exist

**What:** `git_create_pr` failed because there was no `main` or `master` branch on the remote — the repo was empty except for the feature branch.

**How discovered:** Attempted to create PR #1 immediately after pushing the feature branch.

**Root cause:** The repo was created empty (no initial commit on a default branch). The feature branch contained all commits, but GitHub requires a base branch that already exists on the remote for a PR.

**Fix:** Created a `base-initial` branch pointing to the very first commit (`git branch base-initial <first-commit-sha> && git push origin base-initial`), then used `base-initial` as the PR base.

**Verified:** PR #1 was created successfully targeting `base-initial`.

---

## Bug 3: HTML5 drag-and-drop did not fire via automated desktop tool

**What:** During E2E testing, dragging ship pieces from the dock onto the board using the computer tool's mouse actions produced no effect — ships were not placed.

**How discovered:** Test 2 (manual drag-and-drop placement) during recorded E2E testing.

**Root cause:** HTML5 Drag and Drop API events (`dragstart`, `dragover`, `drop`) require specific `dataTransfer` object setup that automated mouse-move tools do not synthesise. The computer tool moves the mouse pointer but does not generate the full drag event sequence the browser expects.

**Fix:** Simulated the drag-and-drop programmatically from the browser console by constructing `DragEvent` objects with a `DataTransfer` and dispatching `dragstart`, `dragover`, and `drop` events in sequence on the correct DOM elements. This confirmed the drag-and-drop code itself was correct — the issue was purely in the test automation layer.

**Verified:** Ships placed correctly on the board after programmatic drag simulation; the game transitioned to play mode as expected.

---

## Bug 4: Game stuck in ai-turn after programmatic attacks

**What:** After calling `window._game.humanAttack(row, col)` from the console during testing, the game phase changed to `ai-turn` but the AI never fired back, leaving the game stuck.

**How discovered:** Test 4 (play through to game over) during E2E testing, when attempting to accelerate victory by calling `humanAttack` programmatically.

**Root cause:** The `humanAttack()` method on `GameController` only handles the game-logic side — it sets the phase to `ai-turn` but does not trigger the UI's `setTimeout` callback that calls `aiAttack()`. That callback is wired in `main.js`'s `onAiCellClick` handler, which only runs when the user physically clicks a cell on the AI board.

**Fix:** Reverted to clicking cells via the computer tool's UI interactions. Each click triggered the full event handler chain in `main.js`: `humanAttack()` → `renderBoards()` → `announceAttack()` → `setTimeout` → `aiAttack()`.

**Verified:** The game loop proceeded correctly with alternating human and AI turns, eventually reaching game-over.

---

## Bug 5: `window._game` not accessible from console

**What:** During E2E testing, `window._game` was `undefined` — the game object could not be inspected from the browser console.

**How discovered:** Test 4, when trying to read `window._game.aiBoard.grid` to find enemy ship locations for accelerated testing.

**Root cause:** The `game` variable was scoped inside the `init()` function in `main.js` (declared as `const game = new GameController()` at module scope, but the reference was a module-scoped variable — not on `window`). ES modules do not expose their top-level variables to the global scope.

**Fix:** Temporarily added `window._game = game;` after the `GameController` constructor call for the duration of testing. Removed it before the final commit to keep the production code clean.

**Verified:** `window._game.aiBoard.grid` returned the expected 10x10 array during testing. Confirmed `window._game` is absent in the committed source via `grep`.

---

## Bug 6: `placeFleetRandomly` could theoretically loop forever

**What:** The `placeFleetRandomly` method used a `while (!placed)` loop that randomly tried positions until one worked. On a heavily occupied board, this could spin indefinitely.

**How discovered:** Identified during code review / improvement planning after the initial implementation was complete. Not triggered in practice, but a latent defect.

**Root cause:** The algorithm generated random `(row, col, vertical)` tuples and tested `canPlaceShip` each time. If no valid position existed (or very few remained), the loop would retry indefinitely with no termination guarantee.

**Fix:** Replaced the while-retry loop with `_enumerateValidPositions(length)`, which scans the full board once to collect every valid `(row, col, vertical)` triple, then picks one at random from the list. If the list is empty, it throws an `Error` immediately instead of looping.

**Verified:** Unit test `terminates and throws when no valid position exists` fills the board and confirms the method throws rather than hanging. Unit test `places all fleet ships without throwing` confirms normal fleet placement still works.
