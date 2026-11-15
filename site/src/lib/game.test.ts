import { describe, expect, it } from "vitest";
import { active, move, moves, newGame, piecesAt, reverse } from "./game";

describe("moves", () => {
  it("offers in-bounds diagonals", () => {
    expect(moves(newGame())).toEqual([
      { x: 2, y: 6 },
      { x: 4, y: 6 },
    ]);
  });

  it("rejects anything else", () => {
    expect(() => move(newGame(), { x: 3, y: 6 })).toThrow();
  });
});

describe("move", () => {
  it("steps the clock in the current direction", () => {
    let g = move(newGame(), { x: 2, y: 6 });
    expect(g.tick).toBe(1);
    g = move(reverse(g), { x: 1, y: 5 });
    expect(g.tick).toBe(0);
  });

  it("records without forking while the direction holds", () => {
    let g = move(newGame(), { x: 2, y: 6 });
    g = move(g, { x: 3, y: 5 });
    expect(g.pieces).toHaveLength(1);
    expect(active(g).path).toEqual({
      0: { x: 3, y: 7 },
      1: { x: 2, y: 6 },
      2: { x: 3, y: 5 },
    });
  });

  it("forks on the first move after reversing", () => {
    let g = move(newGame(), { x: 2, y: 6 });
    g = reverse(g);
    expect(g.pieces).toHaveLength(1);
    g = move(g, { x: 1, y: 5 });
    expect(g.pieces).toHaveLength(2);
    expect(g.pieces[0].path).toEqual({ 0: { x: 3, y: 7 }, 1: { x: 2, y: 6 } });
    expect(active(g)).toEqual({
      forward: false,
      path: { 1: { x: 2, y: 6 }, 0: { x: 1, y: 5 } },
    });
    expect(piecesAt(g, 0)).toHaveLength(2);
  });

  it("does not fork when reversed twice", () => {
    let g = move(newGame(), { x: 2, y: 6 });
    g = move(reverse(reverse(g)), { x: 3, y: 5 });
    expect(g.pieces).toHaveLength(1);
  });

  it("blocks squares any piece holds at the next tick", () => {
    let g = move(newGame(), { x: 2, y: 6 });
    // Back to tick 0: the original still stands on 3,7 there.
    g = reverse(g);
    expect(moves(g)).not.toContainEqual({ x: 3, y: 7 });
    g = move(g, { x: 1, y: 5 });
    // Forward to tick 1: both earlier pieces stand on 2,6 there.
    g = reverse(g);
    expect(moves(g)).toEqual([
      { x: 0, y: 4 },
      { x: 2, y: 4 },
      { x: 0, y: 6 },
    ]);
  });
});
