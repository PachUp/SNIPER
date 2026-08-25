#!/usr/bin/env bash
# Poll live /api/stocks until desk-level fingerprint matches local seed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LIVE_URL="${SNIPER_LIVE_URL:-https://sniper-proj.netlify.app}"
API="${LIVE_URL%/}/api/stocks"
TRIES="${SNIPER_LIVE_VERIFY_TRIES:-36}"   # ~3 minutes at 5s
SLEEP_S="${SNIPER_LIVE_VERIFY_SLEEP:-5}"

want="$(node "$ROOT/scripts/catalog-fingerprint.mjs" | awk '{print $1" "$2}')"
echo "Local catalog fingerprint: $want"
echo "Waiting for live $API to match…"

for i in $(seq 1 "$TRIES"); do
  got="$(node "$ROOT/scripts/catalog-fingerprint.mjs" --url "$API" 2>/dev/null || echo "fail 0")"
  echo "  try $i/$TRIES → $got"
  if [[ "$got" == "$want" ]]; then
    echo "LIVE_VERIFIED $want"
    exit 0
  fi
  sleep "$SLEEP_S"
done

echo "LIVE_VERIFY_FAILED — live still $got (want $want)"
echo "Netlify may still be building or a deploy failed. Check Deploys UI."
exit 1
