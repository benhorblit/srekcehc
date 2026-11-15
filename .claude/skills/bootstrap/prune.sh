#!/usr/bin/env bash
# Usage: SITE_REPO=owner/name [SITE_URL=...] [SITE_DOMAIN=...]
#        [SITE_PASSWORD=...] prune.sh TAG...
#
# Validates the tags; a domain adds the `domain` tag. With no domain,
# drops `{{SITE_DOMAIN}} | `. With `static`, points wrangler.toml at site/.
# Fills in the {{SITE_*}} placeholders, keeps each `<!-- bootstrap:TAG -->`
# block whose tag is given, drops every other block, and strips the markers.
set -euo pipefail

: "${SITE_REPO:?set SITE_REPO=owner/name}"
export SITE_REPO SITE_NAME="${SITE_REPO#*/}" SITE_PASSWORD="${SITE_PASSWORD:-}"
export SITE_URL="${SITE_URL:-https://$SITE_NAME.pages.dev}" SITE_DOMAIN="${SITE_DOMAIN:-}"
keep=" $* "

# Exactly one of each pair, plus known extras only.
for pair in "public private" "password no-password" "static build" \
            "preview-internal preview-opt-in"; do
  n=0; for t in $pair; do [[ $keep == *" $t "* ]] && n=$((n + 1)); done
  [ $n -eq 1 ] || { echo "choose exactly one of: $pair" >&2; exit 1; }
done
for t in "$@"; do
  case $t in public|private|password|no-password|static|build|\
    preview-internal|preview-opt-in|overnight|pruner) ;;
    *) echo "unknown tag: $t" >&2; exit 1 ;;
  esac
done

if [[ $keep == *" password "* ]]; then
  case $SITE_PASSWORD in
    '' | *'"'* | *'\'* | *$'\n'*)
      echo 'SITE_PASSWORD must be set, without " \\ or a newline' >&2; exit 1 ;;
  esac
fi

# wrangler.toml ships with the build variant's output directory.
if [[ $keep == *" static "* ]]; then
  sed -i 's|^pages_build_output_dir = "dist"$|pages_build_output_dir = "site"|' wrangler.toml
fi

if [ -n "$SITE_DOMAIN" ]; then
  keep="$keep domain "
  host="${SITE_DOMAIN#*://}"; export SITE_HOST="${host%%/*}"
fi
self=':!.claude/skills/bootstrap'

if [ -z "$SITE_DOMAIN" ]; then
  git grep -lF '{{SITE_DOMAIN}} | ' -- . "$self" | xargs -r sed -i 's/{{SITE_DOMAIN}} | //'
fi

git grep -lF '{{SITE_' -- . "$self" | xargs -r perl -pi -e '
  s/\{\{SITE_(REPO|NAME|PASSWORD|URL|DOMAIN|HOST)\}\}/$ENV{"SITE_$1"}/g'

git grep -lF '<!-- bootstrap:' -- . "$self" | while read -r f; do
  awk -v keep="$keep" '
    /^<!-- bootstrap:[a-z-]+ -->$/ {
      tag = $0; sub(/^<!-- bootstrap:/, "", tag); sub(/ -->$/, "", tag)
      inside = 1; on = index(keep, " " tag " ") > 0; next
    }
    /^<!-- \/bootstrap -->$/ { inside = 0; next }
    !inside || on
  ' "$f" | cat -s > "$f.tmp"
  mv "$f.tmp" "$f"
done
