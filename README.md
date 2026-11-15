# {{SITE_NAME}}

**{{SITE_DOMAIN}} | {{SITE_URL}}**

<!-- bootstrap:template -->
A template for one Cloudflare Pages site. Create a repo from it, open it
in Claude Code and run `/bootstrap`. It asks the setup choices (audience,
password, build, previews, extras), prunes the repo to match, and opens a
setup PR with the Cloudflare checklist.
<!-- /bootstrap -->

<!-- bootstrap:static -->
    site/        the published directory, served as is
<!-- /bootstrap -->
<!-- bootstrap:build -->
    site/        the site's source
    scripts/     build.sh assembles dist/, the published directory
<!-- /bootstrap -->
<!-- bootstrap:pruner -->
    scripts/     prune-deployments.mjs deletes old Pages deployments
<!-- /bootstrap -->
    .github/     ci.yml checks every PR
<!-- bootstrap:pruner -->
    .github/     prune-deployments.yml runs the pruner (manual until enabled)
<!-- /bootstrap -->
    .claude/     the template-update skill: pulls in template changes
    .claude/     a hook that blocks accidental `#N` issue links
<!-- bootstrap:overnight -->
    .claude/     the overnight skill: picks up one "Overnight" issue
<!-- /bootstrap -->
<!-- bootstrap:password -->
    functions/   the password gate
<!-- /bootstrap -->
    docs/        how it works
    wrangler.toml the Pages project config

<!-- bootstrap:build -->
## Build

    bash scripts/build.sh      # writes dist/
<!-- /bootstrap -->
