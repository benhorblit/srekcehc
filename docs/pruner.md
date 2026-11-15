# Pruning old deployments

Pages keeps every build at its own permanent `<hash>.<project>.pages.dev`.
The branch alias moves to the newest; the ones it moved off stay up, and
deleting the branch retracts none of them.

`scripts/prune-deployments.mjs` deletes deployments whose branch is gone
and commit builds an alias has moved off. It never deletes what an alias
points at. `.github/workflows/prune-deployments.yml` runs it.

**It starts manual-only.** Its `delete` and `schedule` triggers are
commented out; turn them on only deliberately.

    bun scripts/prune-deployments.mjs              # both sweeps, prints only
    bun scripts/prune-deployments.mjs --delete
    bun scripts/prune-deployments.mjs --help

## The token and the secrets

An account API token with **Cloudflare Pages: Edit** and nothing else
(`Pages: Read` cannot delete; `Edit` can delete the whole project), and
the account ID. Repository secrets: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`. Without them the job says so and exits clean.

The Pages project name is hardcoded in the script and must match the
dashboard.

## What it costs

Old production builds are what a rollback would use. Deleting is not
retraction: a copy someone already fetched stays with them.
