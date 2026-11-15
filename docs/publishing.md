# What reaches the web

`scripts/build.sh` is the Pages build command. It writes `dist/`, the
output directory, by copying files from `site/` by name. Nothing reaches
the web until it is named there, so a file in `site/` the script doesn't
copy stays unpublished. Never replace the list with `cp -R`.

`wrangler.toml` sets which directory gets published. Never change it:
Cloudflare deploys a branch the moment it's pushed, before anyone
reviews it, so a wrong value goes public right away.

## The password gate

`functions/_middleware.js` runs on every request and serves nothing but
the login page until the visitor has the password, which is set in that
file.

`PUBLIC_PATHS` lists the crawler opt-out files and nothing else: a bot
that must log in to read "keep out" never reads it.

`_headers` only applies to static assets, so the gate's own responses
carry the opt-out headers by hand. Keep them in step.

## The crawler opt-out

The site is closed to search engines, bots and AI/agent crawlers, as
restrictively as the standards allow. Every layer below is deliberate:

| Where | Says |
| --- | --- |
| `robots.txt` | `Disallow: /` for every agent, with Cloudflare's Content Signals Policy quoted verbatim (never paraphrase it) and `Content-Signal` all `no`. |
| `ai.txt`, `.well-known/ai.txt` | The same refusal, for AI crawlers that look there. |
| `llms.txt` | The refusal, where an agent looking for an opt-in map finds it. |
| `.well-known/tdmrep.json` | W3C TDM Reservation Protocol: rights reserved (`1`). |
| `_headers` | Repeats all of it on every static response, for clients that never read `robots.txt`. |
| `<meta>` on every page | `robots` and `tdm-reservation`, the in-markup forms. |

Not redundant, though it looks it:

- **`Content-Signal` header.** Cloudflare's Markdown for Agents treats the
  origin's header as authoritative, and with none assumes `yes` to all.
- **`Content-Usage` header.** The `robots.txt` line is inert under
  `Disallow: /` (IETF aipref attach §3.1); the header is where the
  preference actually applies.
- **`tdm-reservation` in three places** (header, `tdmrep.json`, meta).
  They must always agree on `1`; one changed alone is a weaker
  reservation.
- **`! Access-Control-Allow-Origin`** removes the `*` Pages adds by
  default, so no other page can `fetch()` this site and read it.
- **`Content-Security-Policy`** loads nothing from any origin but this
  one. Add an origin only deliberately.

These ask; they don't enforce. Enforcement is in the dashboard:
[cloudflare.md](cloudflare.md).

## CI

`.github/workflows/ci.yml` runs on every PR and push to `master`, as
three checks:

- **⚙️ Pages config**: `wrangler.toml` names the published directory.
- **🧩 Functions**: everything in `functions/` parses.
- **📦 Published files**: builds, lists every published file on the
  run's summary page, and checks the opt-out files, `404.html` and every
  page's meta tags, reporting every problem in one run.

## `404.html`

Required. Without a top-level `404.html`, Pages treats the site as a SPA
and serves `index.html` with a 200 for every unmatched path.
