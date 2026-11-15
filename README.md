# srekcehc

**https://srekcehc.pages.dev**

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
