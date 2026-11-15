#!/usr/bin/env bash
# The Cloudflare Pages build command: assembles dist/ from site/.
#
# Only what is copied here is published. Copy by name, never `cp -R`:
# naming files fails safe, a recursive copy ships whatever you forgot.
# A non-zero exit fails the deploy and the last good one stays live.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/site"
OUT="$ROOT_DIR/dist"

rm -rf "$OUT"
mkdir -p "$OUT"

cp "$SRC/index.html" "$SRC/404.html" "$OUT/"

# Crawler opt-out. Copied last so nothing above can override it.
cp "$SRC/robots.txt" "$SRC/ai.txt" "$SRC/llms.txt" "$SRC/_headers" "$OUT/"
mkdir -p "$OUT/.well-known"
cp "$SRC/.well-known/ai.txt" "$SRC/.well-known/tdmrep.json" "$OUT/.well-known/"
