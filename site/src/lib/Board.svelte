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

  const here = $derived(piecesAt(game, game.tick));

  function pieceOn(s: Square) {
    const piece = here.findLast(
      (p) => p.path[game.tick].x === s.x && p.path[game.tick].y === s.y,
    );
    if (!piece) return null;
    return {
      label: game.pieces.indexOf(piece) + 1,
      forward: piece.forward,
      active: piece === active(game),
    };
  }

  function isTarget(s: Square) {
    return targets.some((t) => t.x === s.x && t.y === s.y);
  }
</script>

<div class="board" role="grid" aria-label="Board">
  {#each squares as s (`${s.x},${s.y}`)}
    {@const piece = pieceOn(s)}
    {@const target = isTarget(s)}
    <button
      class="square"
      class:dark={isDark(s)}
      class:target
      disabled={!target}
      aria-label={`${s.x + 1},${s.y + 1}${piece ? ` piece ${piece.label}` : ""}`}
      onclick={() => onmove(s)}
    >
      {#if piece}
        <span
          class="piece"
          class:inverted={!piece.forward}
          class:active={piece.active}>{piece.label}</span
        >
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
    width: 72%;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 600;
    font-size: clamp(0.7rem, 2.5vw, 1rem);
    background: #1a1a1a;
    color: #f0f0f0;
    border: 2px solid #f0f0f0;
    box-sizing: border-box;
  }

  .piece.inverted {
    background: #f0f0f0;
    color: #1a1a1a;
    border-color: #1a1a1a;
  }

  .piece.active {
    box-shadow: 0 0 0 3px var(--target);
  }
</style>
