# The app

A Svelte 5 + TypeScript app, built with Vite. The rules are in
`README.md`.

## Layout

    site/index.html          Vite's entry; keeps the crawler meta tags
    site/src/main.ts         mounts App
    site/src/App.svelte      holds the game state
    site/src/lib/game.ts     the rules, as pure functions
    site/src/lib/game.test.ts
    site/src/lib/Board.svelte
    site/src/lib/TimeToggle.svelte

## Rules as built

- One piece starts at 4,8 (column, row; 1-indexed from the top left).
- A move is one diagonal step, any of the four, onto a square no piece
  holds at the next tick. Click a marked square to move.
- The toggle reverses time. The next move then freezes the active piece
  and a copy moves instead. The copy starts with only its current square,
  not the old piece's history.
- Pieces moving backward in time are drawn inverted. The active piece is
  ringed.

## Commands

    npm run dev       dev server
    npm run build     writes build/
    npm run lint      Prettier, then ESLint
    npm run format    Prettier --write
    npm run check     svelte-check (types)
    npm test          Vitest

Node version: `.node-version`. Prettier and ESLint skip `old/`, the
template's files and everything published as-is from `site/`.

## Build

`vite.config.ts` gives the output fixed names (`index.html`, `app.js`,
`app.css`) so `scripts/build.sh` can copy them by name. The script fails
if Vite emits anything else; see [publishing.md](publishing.md).
