# srekcehc

**https://srekcehc.pages.dev**

Checkers with time reversal.

## Core principles

1. **One global clock.** Each round steps it one tick, forward or
   backward, in the current direction. In a round both players move,
   and both moves land at the new tick together.
2. **A piece is a recording:** one position per tick.
3. **Each player moves only their newest piece.** Each move writes its
   position at the new tick.
4. **Reversing direction forks the active pieces.** On the next round a
   copy of each becomes its player's active piece and the old one
   freezes.
5. **Frozen recordings are permanent.** Each appears exactly at the
   ticks it recorded, nowhere else.
6. **The board shows the present tick:** every recording with a
   position at that tick.

    site/        the site's source: the Svelte app and published files
    scripts/     build.sh builds the app and assembles dist/, the published directory
    old/         the original prototype, kept for reference
    .github/     ci.yml checks every PR
    .claude/     the template-update skill: pulls in template changes
    .claude/     a hook that blocks accidental `#N` issue links
    functions/   the password gate
    docs/        how it works
    wrangler.toml the Pages project config

## Build

    npm install
    npm run dev                # dev server
    bash scripts/build.sh      # writes dist/
