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

# Untracked workflow files alone are not a deploy (need workflow OAuth scope).
# Matches ?? .github / ?? .github/ / ?? .github/workflows/...
dirty="$(
  git status --porcelain \
    | grep -Ev '^\?\? \.github(/|$)' \
    || true
)"
if [[ -z "$dirty" ]]; then
  echo '{}'
  exit 0
fi

if bash scripts/deploy-live.sh >/tmp/sniper-deploy-live.log 2>&1; then
  if grep -q 'DEPLOY_PUSHED' /tmp/sniper-deploy-live.log 2>/dev/null; then
    printf '%s\n' '{"followup_message":"Deployed to https://sniper-proj.netlify.app/ — Netlify is rebuilding."}'
  else
    echo '{}'
  fi
else
  # Prefer Next's real error over trailing stack frames (processTicksAndRejections…).
  err="$(
    {
      grep -E '^(Error:|PageNotFoundError:|Module not found|Type error|Failed to compile|BUILD_FAILED)' /tmp/sniper-deploy-live.log 2>/dev/null \
        || grep -E '^(Error:|PageNotFoundError:|Module not found|Type error|Failed to compile)' /tmp/sniper-predeploy-build.log 2>/dev/null \
        || tail -n 5 /tmp/sniper-deploy-live.log 2>/dev/null
    } | head -n 3 | tr '\n' ' ' | sed 's/"/\\"/g'
  )"
  printf '%s\n' "{\"followup_message\":\"Live deploy failed: ${err}\"}"
fi
exit 0
