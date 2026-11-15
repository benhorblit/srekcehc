# Cloudflare

What this repo depends on that lives in the Cloudflare dashboard, not
here. The files in `site/` ask crawlers to stay out; only these settings
enforce it.

## Checklist

- [ ] **Workers & Pages → Create → Pages → Connect to Git**: this repo, project name `srekcehc`, production branch `master`.
- [ ] **Build settings**: build command `bash scripts/build.sh`, root directory blank, build output directory `dist` (`wrangler.toml` sets it too).
- [ ] **Settings → Builds → Branch control**: preview branches *Custom*, include `*`, exclude `internal/*`.
- [ ] If Pages gave the project a different `*.pages.dev` address than https://srekcehc.pages.dev, fix it in `README.md`, and `name` in `wrangler.toml`.
