// The rules, as pure functions. README.md states the principles.

export const SIZE = 8;

export type Player = 1 | 2;

export type Square = { x: number; y: number };

/** A piece: whose it is, where it was at each tick it lived through, and
 * which way through time it travels. */
export type Piece = {
  player: Player;
  forward: boolean;
  path: Record<number, Square>;
};

export type Game = {
  tick: number;
  /** The direction the next round goes. Shared by both players. */
  forward: boolean;
  /** Oldest first. Each player's last piece is their active one. */
  pieces: Piece[];
  /** Whose pick it is this round. */
  turn: Player;
  /** Player 1's pick, held until player 2 picks and the round resolves. */
  pending: Square | null;
};

export function newGame(): Game {
  return {
    tick: 0,
    forward: true,
    pieces: [
      { player: 1, forward: true, path: { 0: { x: 3, y: 7 } } },
      { player: 2, forward: true, path: { 0: { x: 4, y: 0 } } },
    ],
    turn: 1,
    pending: null,
  };
}

export function isDark({ x, y }: Square): boolean {
  return (x + y) % 2 === 0;
}

const same = (a: Square, b: Square) => a.x === b.x && a.y === b.y;

export function next(game: Game): number {
  return game.tick + (game.forward ? 1 : -1);
}

export function active(game: Game, player: Player): Piece {
  return game.pieces.findLast((p) => p.player === player)!;
}

/** Every piece with a position at `tick`. */
export function piecesAt(game: Game, tick: number): Piece[] {
  return game.pieces.filter((p) => p.path[tick]);
}

/** Squares the player to pick can move to: one diagonal step, onto a
 * square no piece holds at the next tick and player 1 hasn't picked. */
export function moves(game: Game): Square[] {
  const from = active(game, game.turn).path[game.tick];
  const tick = next(game);
  const taken = piecesAt(game, tick).map((p) => p.path[tick]);
  if (game.pending) taken.push(game.pending);
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
        !taken.some((t) => same(t, s)),
    );
}

/** Records the player to pick's move. Player 1's is held; player 2's
 * resolves the round: both active pieces land at the next tick together.
 * An active piece whose direction differs from time's freezes, and a copy,
 * starting where it stands, moves instead. */
export function move(game: Game, to: Square): Game {
  if (!moves(game).some((s) => same(s, to))) {
    throw new Error(`illegal move to ${to.x},${to.y}`);
  }
  if (game.turn === 1) return { ...game, turn: 2, pending: to };

  const tick = next(game);
  const pieces = [...game.pieces];
  const targets: Record<Player, Square> = { 1: game.pending!, 2: to };
  for (const player of [1, 2] as const) {
    const i = pieces.findLastIndex((p) => p.player === player);
    let piece = pieces[i];
    if (piece.forward !== game.forward) {
      piece = {
        player,
        forward: game.forward,
        path: { [game.tick]: piece.path[game.tick] },
      };
      pieces.push(piece);
    }
    const moved = {
      ...piece,
      path: { ...piece.path, [tick]: targets[player] },
    };
    pieces[pieces.lastIndexOf(piece)] = moved;
  }
  return { ...game, tick, pieces, turn: 1, pending: null };
}

/** Flips time's direction. Only between rounds. */
export function reverse(game: Game): Game {
  if (game.pending) throw new Error("can't reverse time mid-round");
  return { ...game, forward: !game.forward };
}
