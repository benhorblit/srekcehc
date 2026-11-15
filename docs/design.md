# Design notes

Where the rules are headed. The settled principles are in `README.md`;
the rules as built are in [app.md](app.md). Move an item there once
it's built.

## Current plan

The next version of the game, as decided so far. Each line can still
change.

- **Board:** 10×10, international draughts size. Pieces play on dark
  squares only.
- **Time bounds, no toggle.** The clock runs between ticks 0 and 9, the
  9 moves it takes to cross the board. Reaching a bound bounces time,
  like being kinged in time instead of space. A bounce forks every
  active piece, as a manual reversal does now.
- **Two bounces:** rounds 1–9 run forward from tick 0 to 9. Bounce.
  Rounds 10–18 run back to tick 0. Bounce. Then forward again; what
  happens after that is open (below).
- **Rounds:** both players pick one move, which lands at the next tick
  together. Picks would ideally be secret and revealed at once. A
  hot-seat prototype can't hide them, so player 1's pick stays visible.
- **Capture by jumping,** as in checkers: hop over an adjacent enemy
  piece onto the empty square beyond. A jump moves two rows in one
  tick, so it also breaks the parity lock under "Players never meet".
- **Life is linear.** A captured piece is erased from every higher
  tick, but stays at every lower one, whatever direction it travels.
  Copies it forked above the capture tick are erased too, so one
  capture can erase a chain of pieces.
- **Win:** the game ends when a player has no piece at the present
  tick. Because erasing cascades through copies, that also means none
  at any higher tick. It's checked at that moment: their past pieces
  would come back when the clock runs down.
- **Playability:** a history scrubber, to look at any tick without
  changing the one being played, and a toggle that draws every piece's
  recorded path.

## Open

- **After the second bounce.** Leaning: the game ends at tick 9 after
  the third pass, 27 rounds, as a draw or decided on pieces. The
  alternative is no more bounces, with the clock running on past 9.
- **Starting pieces.** More than one each, far fewer than a full board,
  for more chances to change the board by deliberate maneuvering. How
  many, and placed where? Pieces on rows of opposite parity can be
  adjacent; pieces on rows of the same parity can compete for squares.
- **Moving one piece of several.** A player picks one piece per round.
  Do the others stay put and record their square at the new tick, or
  vanish from it?
- **Overlap at a fork.** For the one tick when a piece forks, the copy
  and the frozen piece share a square. Allow it, or require the first
  move after a fork to leave that square?
- **Swaps and crossings.** Two pieces can trade squares between ticks,
  or cross each other's diagonal in one step. Both are allowed now.

## Background

- **Players never meet.** Each round moves every piece one row, so
  without jumps a piece's row parity is fixed by the tick. With the
  current starting squares the two players' parity is always opposite:
  they can stand diagonally adjacent but never compete for a square.
  Moving one start by a row would flip this, which would make jumps
  impossible.

## Set aside

- **Unlocked time flip.** Each move would go from its piece's own tick,
  in whatever direction time ran when it was made, so the players
  stop sharing a present. Recording and forking need no change, but
  the board can only show one tick, the players drift apart in time,
  and collisions get lopsided. Time bounds replace the toggle instead.
