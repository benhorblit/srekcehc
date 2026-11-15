<script lang="ts">
  import Board from "./lib/Board.svelte";
  import TimeToggle from "./lib/TimeToggle.svelte";
  import { move, moves, newGame, reverse, type Square } from "./lib/game";

  let game = $state(newGame());
  const targets = $derived(moves(game));

  function play(to: Square) {
    game = move(game, to);
  }
</script>

<main>
  <Board {game} {targets} onmove={play} />
  <div class="controls">
    <TimeToggle
      forward={game.forward}
      disabled={game.pending !== null}
      ontoggle={() => (game = reverse(game))}
    />
    <span class="status">
      <span class="swatch p{game.turn}"></span>
      Player {game.turn}
      <span class="tick">· tick {game.tick}</span>
    </span>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .swatch {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    background: #1a1a1a;
    border: 2px solid #f0f0f0;
    box-shadow: 0 0 0 1px var(--muted);
  }

  .swatch.p2 {
    background: #c62828;
  }

  .tick {
    font-weight: 400;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
