import { describe, expect, it } from "vitest";
import {
  active,
  move,
  moves,
  newGame,
  piecesAt,
  reverse,
  type Game,
  type Square,
} from "./game";

/** Plays one round: player 1's move, then player 2's. */
function round(g: Game, p1: Square, p2: Square): Game {
  return move(move(g, p1), p2);
}

const A = { x: 2, y: 6 };
const B = { x: 5, y: 1 };

describe("moves", () => {
  it("offers in-bounds diagonals to the player to pick", () => {
    const g = newGame();
    expect(moves(g)).toEqual([
      { x: 2, y: 6 },
      { x: 4, y: 6 },
    ]);
    expect(moves(move(g, A))).toEqual([
      { x: 3, y: 1 },
      { x: 5, y: 1 },
    ]);
  });

  it("rejects anything else", () => {
    expect(() => move(newGame(), { x: 3, y: 6 })).toThrow();
  });

  it("keeps player 2 off player 1's pick", () => {
    // Unreachable from the start position (see docs/app.md), so built by hand.
    const g: Game = {
      ...newGame(),
      pieces: [
        { player: 1, forward: true, path: { 0: { x: 3, y: 5 } } },
        { player: 2, forward: true, path: { 0: { x: 3, y: 3 } } },
      ],
    };
    expect(moves(move(g, { x: 4, y: 4 }))).toEqual([
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 4 },
    ]);
  });
});

describe("rounds", () => {
  it("holds player 1's pick until player 2 picks", () => {
    const g = move(newGame(), A);
    expect(g.tick).toBe(0);
    expect(g.turn).toBe(2);
    expect(g.pending).toEqual(A);
  });

  it("lands both moves at the next tick", () => {
    const g = round(newGame(), A, B);
    expect(g.tick).toBe(1);
    expect(g.turn).toBe(1);
    expect(g.pending).toBeNull();
    expect(active(g, 1).path[1]).toEqual(A);
    expect(active(g, 2).path[1]).toEqual(B);
  });

  it("can't reverse mid-round", () => {
    expect(() => reverse(move(newGame(), A))).toThrow();
  });
});

describe("reversing time", () => {
  it("steps the clock backward", () => {
    let g = round(newGame(), A, B);
    g = round(reverse(g), { x: 1, y: 5 }, { x: 6, y: 2 });
    expect(g.tick).toBe(0);
  });

  it("forks both active pieces on the next round", () => {
    let g = round(newGame(), A, B);
    g = reverse(g);
    expect(g.pieces).toHaveLength(2);
    g = round(g, { x: 1, y: 5 }, { x: 6, y: 2 });
    expect(g.pieces).toHaveLength(4);
    expect(g.pieces[0].path).toEqual({ 0: { x: 3, y: 7 }, 1: A });
    expect(active(g, 1)).toEqual({
      player: 1,
      forward: false,
      path: { 1: A, 0: { x: 1, y: 5 } },
    });
    expect(active(g, 2).path).toEqual({ 1: B, 0: { x: 6, y: 2 } });
    expect(piecesAt(g, 0)).toHaveLength(4);
  });

  it("does not fork when reversed twice", () => {
    let g = round(newGame(), A, B);
    g = round(reverse(reverse(g)), { x: 3, y: 5 }, { x: 4, y: 2 });
    expect(g.pieces).toHaveLength(2);
  });

  it("blocks squares frozen pieces hold at the next tick", () => {
    let g = reverse(round(newGame(), A, B));
    // Back to tick 0: the originals still stand on their start squares.
    expect(moves(g)).not.toContainEqual({ x: 3, y: 7 });
    g = move(g, { x: 1, y: 5 });
    expect(moves(g)).not.toContainEqual({ x: 4, y: 0 });
  });
});
