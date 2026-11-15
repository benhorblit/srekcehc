#!/usr/bin/env bash
# PreToolUse hook for Bash and mcp__github__create_branch.
#
# The first time in a session that Claude tries to create a branch on origin
# that isn't `preview` or under `internal/`, block it with a reminder of the
# branch rules. Any later attempt at that branch passes.

input=$(cat)
field() { jq -r "$1 // empty" <<<"$input"; }

# 1. An attempt already blocked once this session passes.
tried="${TMPDIR:-/tmp}/claude-new-branch-$(field .session_id)"
attempt=$(jq -c .tool_input <<<"$input")
touch "$tried"
grep -qxF -- "$attempt" "$tried" && exit 0

# 2. Find the branches this would create on origin.
new_branches() {
  if [[ $(field .tool_name) == mcp__github__create_branch ]]; then
    field .tool_input.branch
    return
  fi

  # Dry-run each `git ... push` in the command, so git itself resolves HEAD,
  # refspecs, -C and so on. Porcelain output marks new refs with `*`.
  cd "$(field .cwd)" 2>/dev/null
  field .tool_input.command |
    grep -oE '\bgit\b[^;&|]*\bpush\b[^;&|<>]*' |
    while read -r push; do
      push=$(sed -E '
        s/\s+[0-9]*$//                               # fd of a trailing redirect, e.g. 2>&1
        s/\s(-u|--set-upstream)\b//g                 # a dry run must not set upstream
        s/\bpush\b/push --dry-run --porcelain/' <<<"$push")
      eval "$push" 2>/dev/null
    done |
    sed -nE 's|^\*\t[^:]+:refs/heads/(\S+).*|\1|p'
}

# 3. Allow `preview`, `internal/*` and branches already blocked once.
blocked=$(new_branches | grep -vxE 'preview|internal/.+' | grep -vxFf "$tried")
[[ -z $blocked ]] && exit 0

# 4. Block, and record the attempt and branches so any rerun passes.
printf '%s\n' "$attempt" "$blocked" >>"$tried"
cat >&2 <<MSG
Blocked: this push creates branch $(paste -sd, <<<"$blocked" | sed 's/,/, /g').
Unless told otherwise, work goes on \`preview\`, or on an \`internal/\` branch if it doesn't touch deployed files.
If you're sure this branch is correct, run the command again.
MSG
exit 2
