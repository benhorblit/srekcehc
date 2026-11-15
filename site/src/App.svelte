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
      ontoggle={() => (game = reverse(game))}
    />
    <span class="tick">tick {game.tick}</span>
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

  .tick {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
