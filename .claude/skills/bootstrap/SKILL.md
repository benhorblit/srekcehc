---
name: bootstrap
argument-hint: [additional instructions]
description: Set up a repo just created from the site template — ask the setup choices, prune the repo to them, and open the setup PR, which deletes this skill. Run once, first thing.
---

Stop if `origin` is the template repo itself (`benhorblit/template`): it
must stay unpruned.

1. **Ask**, in one AskUserQuestion call, each a single choice:
   - **Audience**: `public` (meant for strangers) or `private` (a personal audience).
   - **Password**: `password` (gated) or `no-password` (open). Independent of audience.
   - **Build**: `static` (`site/` served as is) or `build` (`scripts/build.sh` assembles `dist/` by name; the place to grow a real build).
   - **Previews**: `preview-internal` (every branch but `internal/*`) or `preview-opt-in` (only `preview` and `preview/*`).

   Then a second call:
   - **Cloudflare URL**: `https://<name>.pages.dev` (recommended), or
     another if the Pages project already exists with a suffix. The
     checklist covers fixing it later.
   - **Custom domain** (optional): none, or the user types one.
   - **Extras**, multi-select, none by default:
     - `overnight`: the skill that picks up one "Overnight" issue unattended.
     - `pruner`: deletes old Pages deployments. Starts manual-only even when chosen.

   With `password`, ask for the password in chat. It can't contain `"`
   or `\`, and it will be committed to this private repo.

2. **Branch**: `git checkout -b internal/bootstrap`.

3. **Prune**. First replace the template's CLAUDE.md with the site's:

       git mv -f CLAUDE.site.md CLAUDE.md

   Then run the prune script, passing every chosen tag:

       SITE_REPO=<owner>/<name> SITE_URL=<url> SITE_DOMAIN=<url or empty> \
         SITE_PASSWORD=<password> bash .claude/skills/bootstrap/prune.sh <tags>...

   URLs are full, with `https://`.

   Then `git rm -rf` what the choices drop:
   - `no-password`: `functions`
   - `static`: `scripts/build.sh .gitignore`
   - no `overnight`: `.claude/skills/overnight`
   - no `pruner`: `scripts/prune-deployments.mjs docs/pruner.md .github/workflows/prune-deployments.yml`
   - always: `.claude/skills/bootstrap`

4. **Check**: `git add -A`, then `git grep --cached -n -e 'bootstrap:' -e '{{SITE_'` finds nothing. With
   `build`, `bash scripts/build.sh` succeeds and `dist/` holds exactly
   `index.html 404.html robots.txt ai.txt llms.txt _headers
   .well-known/ai.txt .well-known/tdmrep.json`; then `rm -rf dist`.

5. **Ship**: commit everything staged as `Set up from template`, `git push -u origin
   internal/bootstrap`, and open a PR titled `Set up from template`. The
   body lists the choices, but never the password.

6. **Checklist**: comment on the PR with the `## Checklist` section of
   `docs/cloudflare.md`, as pruned, verbatim.

7. **Extra instructions**: if the skill was given arguments, apply them
   now, as additional changes on the setup branch and PR.
