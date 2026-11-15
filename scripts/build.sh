#!/usr/bin/env bash
# The Cloudflare Pages build command: builds the app from site/ with
# Vite into build/, then assembles dist/ from build/ and site/.
#
# Only what is copied here is published. Copy by name, never `cp -R`:
# naming files fails safe, a recursive copy ships whatever you forgot.
# A non-zero exit fails the deploy and the last good one stays live.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/site"
BUILD="$ROOT_DIR/build"
OUT="$ROOT_DIR/dist"

cd "$ROOT_DIR"
[ -d node_modules ] || npm ci --no-audit --no-fund
npx vite build

rm -rf "$OUT"
mkdir -p "$OUT"

# The app. vite.config.ts fixes these names. Anything else Vite emits
# (a new chunk or asset) would be silently dropped, so fail instead.
APP_FILES="app.css app.js index.html"
if [ "$(cd "$BUILD" && find . -type f -printf '%P\n' | sort | xargs)" != "$APP_FILES" ]; then
  echo "::error file=scripts/build.sh,title=Unexpected build output::build/ must hold exactly: $APP_FILES" >&2
  ls -R "$BUILD" >&2
  exit 1
fi
cp "$BUILD/index.html" "$BUILD/app.js" "$BUILD/app.css" "$OUT/"
cp "$SRC/404.html" "$OUT/"

# Crawler opt-out. Copied last so nothing above can override it.
cp "$SRC/robots.txt" "$SRC/ai.txt" "$SRC/llms.txt" "$SRC/_headers" "$OUT/"
mkdir -p "$OUT/.well-known"
cp "$SRC/.well-known/ai.txt" "$SRC/.well-known/tdmrep.json" "$OUT/.well-known/"
