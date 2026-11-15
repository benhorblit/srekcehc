<script lang="ts">
  import {
    SIZE,
    active,
    isDark,
    piecesAt,
    type Game,
    type Square,
  } from "./game";

  type Props = {
    game: Game;
    targets: Square[];
    onmove: (to: Square) => void;
  };
  let { game, targets, onmove }: Props = $props();

  const squares = Array.from({ length: SIZE * SIZE }, (_, i) => ({
    x: i % SIZE,
    y: Math.floor(i / SIZE),
  }));

  const same = (a: Square, b: Square) => a.x === b.x && a.y === b.y;

  const here = $derived(piecesAt(game, game.tick));
  const moving = $derived(active(game, game.turn));

  function pieceOn(s: Square) {
    const piece = here.findLast((p) => same(p.path[game.tick], s));
    if (!piece) return null;
    const own = game.pieces.filter((p) => p.player === piece.player);
    return {
      player: piece.player,
      label: own.indexOf(piece) + 1,
      forward: piece.forward,
      moving: piece === moving,
    };
  }
</script>

<div class="board" role="grid" aria-label="Board">
  {#each squares as s (`${s.x},${s.y}`)}
    {@const piece = pieceOn(s)}
    {@const target = targets.some((t) => same(t, s))}
    {@const pending = game.pending && same(game.pending, s)}
    <button
      class="square"
      class:dark={isDark(s)}
      class:target
      disabled={!target}
      aria-label={`${s.x + 1},${s.y + 1}${piece ? ` player ${piece.player} piece ${piece.label}` : ""}${pending ? " player 1 pick" : ""}`}
      onclick={() => onmove(s)}
    >
      {#if piece}
        <span
          class="piece p{piece.player}"
          class:inverted={!piece.forward}
          class:moving={piece.moving}>{piece.label}</span
        >
      {/if}
      {#if pending}
        <span class="piece p1 ghost"></span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template: repeat(8, minmax(0, 1fr)) / repeat(8, minmax(0, 1fr));
    width: min(90vw, 28rem);
    aspect-ratio: 1;
    border: 2px solid var(--fg);
  }

  .square {
    all: unset;
    display: grid;
    place-items: center;
    background: var(--light-sq);
    position: relative;
  }

  .square.dark {
    background: var(--dark-sq);
  }

  .square.target {
    cursor: pointer;
  }

  .square.target::after {
    content: "";
    position: absolute;
    width: 28%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--target);
    opacity: 0.8;
  }

  .square.target:hover::after,
  .square.target:focus-visible::after {
    opacity: 1;
    width: 40%;
  }

  .square:focus-visible {
    outline: 3px solid var(--target);
    outline-offset: -3px;
  }

  .piece {
    --fill: #1a1a1a;
    --edge: #f0f0f0;
    width: 72%;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 600;
    font-size: clamp(0.7rem, 2.5vw, 1rem);
    background: var(--fill);
    color: var(--edge);
    border: 2px solid var(--edge);
    box-sizing: border-box;
  }

  .piece.p2 {
    --fill: #c62828;
  }

  /* Moving backward in time: fill and edge swap. */
  .piece.inverted {
    background: var(--edge);
    color: var(--fill);
    border-color: var(--fill);
  }

  .piece.ghost {
    position: absolute;
    background: none;
    border: 2px dashed var(--fill);
    opacity: 0.7;
  }

  .piece.moving {
    box-shadow: 0 0 0 3px var(--target);
  }
</style>
