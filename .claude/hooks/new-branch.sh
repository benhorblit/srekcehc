#!/usr/bin/env bash
# PreToolUse hook: blocks the first push in a session of a new branch that
# isn't `preview` or `internal/*`; reruns pass. A dry run resolves targets.
in=$(cat)
j() { jq -r "$1 // \"\"" <<<"$in"; }
cd "$(j .cwd)" 2>/dev/null
if [[ $(j .tool_name) == *create_branch ]]; then branches=$(j .tool_input.branch)
else branches=$(j .tool_input.command | grep -oE '\bgit\b[^;&|]*\bpush\b[^;&|<>]*' |
  sed -E 's/\s+[0-9]*$//; s/\s(-u|--set-upstream)\b//g; s/\bpush\b/push --dry-run --porcelain/' |
  while read -r cmd; do eval "$cmd" 2>/dev/null; done | sed -nE 's|^\*\t[^:]+:refs/heads/(\S+).*|\1|p')
fi
log=${TMPDIR:-/tmp}/claude-new-branch-$(j .session_id); touch "$log"
bad=$(grep . <<<"$branches" | grep -vxE 'preview|internal/.*' | grep -vxFf "$log")
[[ -z $bad ]] && exit 0
echo "$bad" >>"$log"
echo "Blocked: this creates $(paste -sd, <<<"$bad") on origin. Pushed branches are permanent; any outside internal/ gets a public preview. Per CLAUDE.md: published-file changes go on preview, other work on internal/, never claude/*, unless the user named it. If sure, rerun." >&2
exit 2
