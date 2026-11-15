---
name: template-update
description: Pull in changes from the site template.
disable-model-invocation: true
---

Stop if `origin` is `benhorblit/template` itself.

1. **Attach** `benhorblit/template` (read) and clone it to the scratchpad.

2. **Base**: the template commit named by the newest `[template]` commit
   here, else the template's initial commit:

       git log -1 --grep='^\[template\]' --format=%B | grep -oE 'benhorblit/template@[0-9a-f]{40}'

3. **Diff** the template `<base>..HEAD`. Nothing changed: say "Up to
   date" and stop.

4. **Port** by hand on branch `internal/template-update`. This repo was
   pruned at setup, so never apply patches blindly:
   - Skip the bootstrap skill, anything setup removed, and any change
     not relevant to this repo.
   - In marked blocks, take only those setup kept; drop the markers.
   - Use this repo's real values, not placeholders.
   - Keep local changes; ask on a real conflict.

5. **Ship** one commit and one PR. Both titles must start with
   `[template]`: `[template] Update to <short sha>`. Both bodies must
   include:

       Template: benhorblit/template@<full sha of template HEAD>

   PRs are squash-merged, so the PR title and body are the marker. The PR
   body also lists the template commits ported, and any skipped and why.

6. **Verify**: subscribe to the PR and watch CI. Make sure checks pass
   and the update broke nothing.
