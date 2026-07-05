[![Tests](https://github.com/ashchristoffersen-glitch/battleship/actions/workflows/tests.yml/badge.svg)](https://github.com/ashchristoffersen-glitch/battleship/actions/workflows/tests.yml)

# Battleship

A browser-based Battleship game where a human plays against an AI opponent. Built with plain HTML, CSS, and JavaScript — no frameworks, no dependencies, no build step.

## Play

Visit the live game: **https://ashchristoffersen-glitch.github.io/battleship/**

## Features

- Drag-and-drop ship placement with click-to-rotate (touch supported)
- Two difficulty modes: **Easy** (random shots) and **Normal** (hunt-and-target AI with parity)
- Responsive layout for desktop, tablet, and mobile
- ARIA labels on all board cells for screen reader accessibility
- Win/loss scoreboard that persists across rounds

## File Structure

```
js/game/     Pure game logic (no DOM)
  Ship.js         Ship model: length, hits, isSunk()
  Board.js        10x10 grid, placement, attacks, allSunk()
  Player.js       Base player class
  AiPlayer.js     AI with easy/normal difficulty modes
  gameController.js  Turn management, win detection, reset

js/ui/       Rendering (no state mutation)
  boardRenderer.js   Grid creation and state-to-DOM mapping
  dragAndDrop.js     Ship placement (desktop + touch)
  messageDisplay.js  Status bar messages

js/main.js   Entry point — wires game logic to UI
```

## Run Locally

```bash
npx serve .
# or any static file server
```

## Tests

```bash
node --test tests/game.test.js
```

Requires Node.js 18+ (uses built-in `node:test` runner).

<!-- pages redeploy 2026-07-05T22:50:05Z -->
