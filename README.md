# srekcehc

**https://srekcehc.pages.dev**

Checkers with time reversal.

## Core principles

1. **One global clock.** Each move steps it one tick, forward or
   backward, in the current direction.
2. **A piece is a recording:** one position per tick.
3. **Only the newest piece moves.** Each move writes its position at
   the new tick.
4. **Reversing direction forks the piece.** On the next move a copy
   becomes the active piece and the old one freezes.
5. **Frozen recordings are permanent.** Each appears exactly at the
   ticks it recorded, nowhere else.
6. **The board shows the present tick:** every recording with a
   position at that tick.

    site/        the site's source
    scripts/     build.sh assembles dist/, the published directory
    .github/     ci.yml checks every PR
    .claude/     the template-update skill: pulls in template changes
    .claude/     a hook that blocks accidental `#N` issue links
    functions/   the password gate
    docs/        how it works
    wrangler.toml the Pages project config

## Build

    bash scripts/build.sh      # writes dist/
