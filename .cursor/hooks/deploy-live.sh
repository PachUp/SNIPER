#!/usr/bin/env bash
# After each agent turn: sync seeds + push so Netlify updates the live site.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

cat >/dev/null || true

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

bash scripts/sync-runtime-to-seeds.sh >/dev/null 2>&1 || true

if [[ -z "$(git status --porcelain)" ]]; then
  echo '{}'
  exit 0
fi

if bash scripts/deploy-live.sh >/tmp/sniper-deploy-live.log 2>&1; then
  printf '%s\n' '{"followup_message":"Deployed to https://sniper-proj.netlify.app/ — Netlify is rebuilding."}'
else
  err="$(tail -n 3 /tmp/sniper-deploy-live.log 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g')"
  printf '%s\n' "{\"followup_message\":\"Live deploy failed: ${err}\"}"
fi
exit 0
