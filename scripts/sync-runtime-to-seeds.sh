#!/usr/bin/env bash
# Copy desk runtime JSON back into committed seeds for Vercel redeploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/data/.runtime"
SEED="$ROOT/data"

if [[ ! -d "$RUNTIME" ]]; then
  echo "No data/.runtime yet — edit data/*.json directly or save once from the desk."
  exit 0
fi

for f in stocks.json news.json ideas.json snipers.json; do
  if [[ -f "$RUNTIME/$f" ]]; then
    cp "$RUNTIME/$f" "$SEED/$f"
    echo "synced $f"
  fi
done

echo "Done. Commit data/*.json and push to redeploy."
