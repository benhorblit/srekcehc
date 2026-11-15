# Design notes

Open questions about the rules. The settled principles are in
`README.md`; the rules as built are in [app.md](app.md). Move an item
there once it's decided and built.

## Unlocked time flip

**Idea:** don't lock the toggle mid-round. Each move goes one tick from
its piece's own tick, in the direction time runs when that move is
made. Say both players are at tick 5: player 1 moves forward to 6, then
player 2 flips time and moves to 4.

**What already works:**
- The move to 6 is recorded and permanent. It shows whenever the board
  reaches tick 6.
- Forking needs no change: each piece forks when it moves against its
  own direction, so only player 2's piece forks.

**What it changes:** the players stop sharing a present. Each player
has their own "now", and principle 1 (one global clock) would need
rewriting. That raises three problems:
1. **What the board shows.** It can show only one tick. At tick 6 player
   2's active piece has no recording, so it isn't drawn.
2. **Drift.** Every round the directions differ, the gap between the
   players grows. Pieces that never share a tick can never interact.
3. **Lopsided collisions.** Player 1's move to 6 blocks anyone moving
   into 6 later. Player 2's move to 4 blocks player 1 only if player 1
   comes back to 4.

**Open:**
- Between rounds, does the board show player 1's tick, player 2's, or a
  scrubber through all ticks?
- Does anything pull the players back together?

## Smaller open items

- **Overlap at a fork.** For the one tick when a piece forks, the copy
  and the frozen piece share a square. Allow it, or require the first
  move after a fork to leave that square?
- **Swaps and crossings.** Two pieces can trade squares between ticks,
  or cross each other's diagonal in one step. Both are allowed now.
- **Players never meet.** With the current starting squares, the two
  players' row parity is always opposite (see [app.md](app.md) once
  player 2 is merged). They can stand diagonally adjacent but never
  compete for a square. Moving one start by a row flips this: they
  could block each other, but never be adjacent, so capturing would be
  impossible.
