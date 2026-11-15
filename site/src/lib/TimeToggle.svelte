<script lang="ts">
  type Props = { forward: boolean; ontoggle: () => void };
  let { forward, ontoggle }: Props = $props();
</script>

<button
  class="toggle"
  class:reversed={!forward}
  aria-pressed={!forward}
  aria-label="Reverse time"
  title={forward ? "Time runs forward" : "Time runs backward"}
  onclick={ontoggle}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 12h14m-5-6 6 6-6 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .toggle {
    all: unset;
    cursor: pointer;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--fg);
    color: var(--bg);
    border: 2px solid var(--fg);
    transition:
      transform 0.45s cubic-bezier(0.6, 0, 0.3, 1),
      background-color 0.45s,
      color 0.45s;
  }

  .toggle.reversed {
    transform: rotate(180deg);
    background: var(--bg);
    color: var(--fg);
  }

  .toggle:focus-visible {
    outline: 3px solid var(--target);
    outline-offset: 3px;
  }

  svg {
    width: 60%;
    height: 60%;
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle {
      transition: none;
    }
  }
</style>
