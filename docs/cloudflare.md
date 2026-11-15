# Cloudflare

What this repo depends on that lives in the Cloudflare dashboard, not
here. The files in `site/` ask crawlers to stay out; only these settings
enforce it.

## Checklist

- [ ] **Workers & Pages → Create → Pages → Connect to Git**: this repo, project name `{{SITE_NAME}}`, production branch `master`.
<!-- bootstrap:static -->
- [ ] **Build settings**: no build command, root directory blank, build output directory `site` (`wrangler.toml` sets it too).
<!-- /bootstrap -->
<!-- bootstrap:build -->
- [ ] **Build settings**: build command `bash scripts/build.sh`, root directory blank, build output directory `dist` (`wrangler.toml` sets it too).
<!-- /bootstrap -->
<!-- bootstrap:preview-internal -->
- [ ] **Settings → Builds → Branch control**: preview branches *Custom*, include `*`, exclude `internal/*`.
<!-- /bootstrap -->
<!-- bootstrap:preview-opt-in -->
- [ ] **Settings → Builds → Branch control**: preview branches *Custom*, include `preview` and `preview/*`, exclude nothing.
<!-- /bootstrap -->
<!-- bootstrap:pruner -->
- [ ] **Manage Account → Account API Tokens**: a token with *Cloudflare Pages: Edit* only. In GitHub, repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. See `docs/pruner.md`.
- [ ] Optional, later: uncomment the `delete` and `schedule` triggers in `.github/workflows/prune-deployments.yml`.
<!-- /bootstrap -->
- [ ] If Pages gave the project a different `*.pages.dev` address than {{SITE_URL}}, fix it in `README.md`, and `name` in `wrangler.toml`.
<!-- bootstrap:overnight -->
- [ ] For the overnight skill: create the labels `Overnight`, `Night Claude`, `High Priority` and `Medium Priority`, and schedule the routine that runs `/overnight`.
<!-- /bootstrap -->
<!-- bootstrap:domain -->
- [ ] **Custom domains**: add `{{SITE_HOST}}`.
- [ ] On the `{{SITE_HOST}}` zone:
  - [ ] **Security → Settings → AI bot policies**: Search, Agent and Training all *Block (on all pages)*.
  - [ ] **Bot Fight Mode**: on.
  - [ ] **AI Crawl Control → Crawlers**: block every crawler.
  - [ ] **Managed robots.txt**: off. It prepends a more permissive block to ours.
  - [ ] **Markdown for Agents**: off.
<!-- /bootstrap -->
