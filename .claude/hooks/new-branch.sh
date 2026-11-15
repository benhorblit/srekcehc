#!/usr/bin/env bash
# PreToolUse hook for Bash and mcp__github__create_branch.
#
# The first time in a session that Claude tries to create a branch on origin
# that isn't `preview` or under `internal/`, block it with a reminder of the
# branch rules. Any later attempt at that branch passes.
#
# This runs before the user approves the command, so it never runs anything
# from it: the command is only read as text. The one git call is fixed and
# read-only, in the session's directory. A misread costs at most one block.

input=$(cat)
get() { jq -r "$1 // empty" <<<"$input"; }
tried="${TMPDIR:-/tmp}/claude-new-branch-$(get .session_id | tr -cd 'A-Za-z0-9_-')"
attempt=$(jq -c .tool_input <<<"$input")

# 1. An attempt already blocked once this session passes.
grep -qxF -- "$attempt" "$tried" 2>/dev/null && exit 0

# 2. Find the branches this pushes to. For Bash, read each
#    `git [-C dir] push [options] [remote [src:]dst...]`; no dst means HEAD.
declare -A known
if [[ $(get .tool_name) == mcp__github__create_branch ]]; then
  branches=$(get .tool_input.branch)
else
  branches=$(get .tool_input.command | tr ';&|' '\n' | tr -d "\"'" |
    while read -ra w; do
      [[ ${w[0]##*/} == git ]] || continue
      i=1
      while [[ ${w[i]} == -[Cc] ]]; do ((i += 2)); done
      [[ ${w[i]} == push ]] || continue
      args=()
      for a in "${w[@]:i+1}"; do [[ $a == -* || $a == *[\<\>]* ]] || args+=("$a"); done
      refs=("${args[@]:1}")
      for r in "${refs[@]:-HEAD}"; do echo "${r##*:}"; done
    done)
  [[ -n $branches ]] || exit 0
  while IFS= read -r ref; do                          # current and origin branches
    [[ $ref == \** ]] && head=${ref#\*refs/heads/}
    known[${ref#?}]=1
  done < <(git -C "$(get .cwd)" for-each-ref --format='%(HEAD)%(refname)' \
    refs/heads refs/remotes/origin 2>/dev/null)
fi

# 3. Keep branches not tried before, not allowed, and not on origin yet.
declare -A skip
while read -r b; do skip[$b]=1; done < <(cat "$tried" 2>/dev/null)
blocked=()
while read -r b; do
  [[ $b == HEAD ]] && b=$head
  [[ -z $b || ${skip[$b]} || $b == preview || $b == internal/?* ||
    ${known[refs/remotes/origin/$b]} ]] && continue
  skip[$b]=1 blocked+=("$b")
done <<<"$branches"
((${#blocked[@]})) || exit 0

# 4. Block, and record the attempt and branches so any rerun passes.
printf '%s\n' "$attempt" "${blocked[@]}" >>"$tried"
list=$(IFS=,; echo "${blocked[*]}")
cat >&2 <<MSG
Blocked: this push creates branch ${list//,/, }.
Unless told otherwise, work goes on \`preview\`, or on an \`internal/\` branch if it doesn't touch deployed files.
If you're sure this branch is correct, run the command again.
MSG
exit 2
