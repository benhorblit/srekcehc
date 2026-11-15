<script lang="ts">
  import Board from "./lib/Board.svelte";
  import TimeToggle from "./lib/TimeToggle.svelte";
  import {
    canReverse,
    move,
    moves,
    newGame,
    reverse,
    upcoming,
    type Square,
  } from "./lib/game";

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
      forward={upcoming(game)}
      disabled={!canReverse(game)}
      ontoggle={() => (game = reverse(game))}
    />
    <span class="status">
      <span class="swatch p{game.turn}"></span>
      Player {game.turn}
      <span class="tick">· tick {game.tick}</span>
    </span>
  </div>
  <p class="note">
    {#if game.locked}
      Player 2 set time for this round.
    {:else if game.queued}
      Time flips next round.
    {:else}
      &nbsp;
    {/if}
  </p>
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

  .note {
    margin: -0.75rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .tick {
    font-weight: 400;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
