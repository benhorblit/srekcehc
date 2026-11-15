// The rules, as pure functions. README.md states the principles.

export const SIZE = 8;

export type Square = { x: number; y: number };

/** A piece: where it was at each tick it lived through, and which way
 * through time it travels. */
export type Piece = {
  forward: boolean;
  path: Record<number, Square>;
};

export type Game = {
  tick: number;
  /** The direction the next move goes. */
  forward: boolean;
  /** Oldest first; the last one is the active piece. */
  pieces: Piece[];
};

export function newGame(): Game {
  return {
    tick: 0,
    forward: true,
    pieces: [{ forward: true, path: { 0: { x: 3, y: 7 } } }],
  };
}

export function isDark({ x, y }: Square): boolean {
  return (x + y) % 2 === 0;
}

export function active(game: Game): Piece {
  return game.pieces[game.pieces.length - 1];
}

/** Every piece with a position at `tick`. */
export function piecesAt(game: Game, tick: number): Piece[] {
  return game.pieces.filter((p) => p.path[tick]);
}

function occupied(game: Game, tick: number, square: Square): boolean {
  return piecesAt(game, tick).some(
    (p) => p.path[tick].x === square.x && p.path[tick].y === square.y,
  );
}

/** Squares the active piece can move to: one diagonal step, onto a square
 * empty at the next tick. */
export function moves(game: Game): Square[] {
  const from = active(game).path[game.tick];
  const next = game.tick + (game.forward ? 1 : -1);
  return [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
    .map(([dx, dy]) => ({ x: from.x + dx, y: from.y + dy }))
    .filter(
      (s) =>
        s.x >= 0 &&
        s.x < SIZE &&
        s.y >= 0 &&
        s.y < SIZE &&
        !occupied(game, next, s),
    );
}

/** Moves the active piece to `to`. If time was reversed since its last
 * move, it freezes and a copy, starting where it stands, moves instead. */
export function move(game: Game, to: Square): Game {
  if (!moves(game).some((s) => s.x === to.x && s.y === to.y)) {
    throw new Error(`illegal move to ${to.x},${to.y}`);
  }
  const tick = game.tick + (game.forward ? 1 : -1);
  let pieces = game.pieces;
  let piece = active(game);
  if (piece.forward !== game.forward) {
    piece = {
      forward: game.forward,
      path: { [game.tick]: piece.path[game.tick] },
    };
    pieces = [...pieces, piece];
  }
  const moved = { ...piece, path: { ...piece.path, [tick]: to } };
  return { ...game, tick, pieces: [...pieces.slice(0, -1), moved] };
}

export function reverse(game: Game): Game {
  return { ...game, forward: !game.forward };
}
