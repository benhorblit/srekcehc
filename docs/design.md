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

## Life is linear

**Idea:** a piece that's captured is erased from every tick after the
capture, by the clock, but stays in every tick before it. "After" means
higher ticks, whatever direction the piece travels.

**Leaning (can change):** copies it forked after the capture tick are
erased too, so one capture can erase a chain of pieces. This is what
makes "no pieces now" mean "no pieces at any higher tick": every piece
above the present tick traces back through one that stood at it.

## Time bounds instead of a toggle

**Idea:** no manual toggle. Time runs between fixed bounds, say tick 0
and tick 15. Reaching a bound bounces you back, like being kinged in
time instead of space. The bounce forks the piece, as a manual reversal
does now.

**Open:**
- With one shared clock, a bound flips time for both players. Does
  that fit, or does this need per-player clocks (see "Unlocked time
  flip")?
- Where are the bounds, and are they the same for both players?

## Starting pieces

**Idea:** more than one piece each, but far fewer than a full board.
More pieces give more ways to change the board by deliberate
maneuvering.

**Open:**
- How many?
- Which piece moves? Now each player moves only their newest piece.
  With several, a player picks one per round.
- What do the others do that round? They'd stay put and record their
  square at the new tick, or they'd vanish from it.
- Placement. Pieces on rows of opposite parity can be adjacent; pieces
  on rows of the same parity can compete for squares (see "Players
  never meet" below). Mixing rows gives both.

## Board size

**Idea:** almost certainly bigger than 8×8. Copies pile up as time
reverses, so the board fills faster than in checkers.

**Open:**
- How big, and square or not? Trying sizes is cheap: `SIZE` in
  `game.ts` plus the grid size in `Board.svelte`.

## Playability

- **History scrubber:** look at any tick, past or future, without
  changing the tick you're playing at. Players can't plan without
  seeing where the frozen pieces will be.
- **Path overlay:** a toggle that draws every piece's recorded path on
  the board.

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
