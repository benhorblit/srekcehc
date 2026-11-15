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

- Two players, one piece each: player 1 (black) starts at 4,8, player 2
  (red) at 5,1 (column, row; 1-indexed from the top left).
- A round: player 1 picks a move, shown as a dashed outline, then
  player 2 picks. Both land at the next tick together.
- A move is one diagonal step, any of the four, onto a square no piece
  holds at the next tick. Player 2 also can't pick player 1's square.
  Click a marked square to move.
- No capturing yet.
- The toggle reverses time for both players. Player 1 flips it for the
  current round, before picking. Player 2 flips it for the next round,
  since player 1 has already moved in this one, and that locks the
  toggle for player 1's next turn.
- A round that runs against a piece's direction freezes it, and a copy
  moves instead. The copy starts with only its current square, not the
  old piece's history.
- Pieces moving backward in time are drawn inverted. The piece whose
  player is picking is ringed.

### Pieces of different players never meet

Each round moves every active piece one row, so a piece's row parity
is fixed by the tick: player 1's is `7 + tick`, player 2's is `tick`,
always opposite. Pieces of different players can stand diagonally
adjacent but can never want the same square. The rule that keeps
player 2 off player 1's pick exists for when starting squares change.

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
