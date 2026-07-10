# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A vanilla JavaScript Tetris implementation using HTML5 Canvas. No build process, no package manager, no dependencies — three files: `index.html`, `style.css`, `game.js`.

## Running / testing

There is no build, test, or lint tooling. To run the game, open `index.html` directly in a browser, or serve it statically:

```bash
npx serve .
```

Then visit `http://localhost:8000`. Verify changes manually in the browser — there are no automated tests.

## Architecture

All game logic lives in `game.js` (~300 lines), organized around a `requestAnimationFrame` loop and mutable module-level state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc. — declared once at the top, reset in `init()`).

- **Board model**: `ROWS × COLS` (20×10) matrix; each cell is `0` (empty) or a 1–7 color index.
- **Pieces**: defined as square matrices in `PIECES`. Rotation (`rotateCW`) is a transpose + column reversal, not per-piece rotation tables.
- **Collision** (`collide`): checks board bounds and existing fixed blocks.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until a non-colliding position is found.
- **Locking a piece** (`lockPiece`): `merge()` writes the piece into `board` → `clearLines()` removes full rows and rescoring → `spawn()` promotes `next` to `current` and generates a new `next`; if the new piece immediately collides, `endGame()` fires.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` indexed by lines cleared at once, multiplied by `level`. Hard drop adds 2 points/row dropped; soft drop adds 1 point/row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Rendering** (`draw`): clears canvas, draws grid, fixed board blocks, a ghost piece (`ghostY()` projects straight down, drawn at `globalAlpha = 0.2`), then the current piece. `drawNext` renders the next-piece preview canvas the same way, centered in a 4×4 grid.
- **Input**: single `keydown` listener switches on `e.code` (arrows + `KeyX` rotate + `Space` hard drop + `KeyP` pause); ignored while paused or game over.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (px per cell), `COLORS`, `LINE_SCORES`. If you change `COLS`/`ROWS`/`BLOCK`, also update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).
