#!/usr/bin/env bash
# Sync desk runtime → committed seeds, verify build, commit, push, verify live.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/sync-runtime-to-seeds.sh"

# Keep untouched EP/TP/SL current before every ship (Audit-edited tickers frozen).
if [[ -f "$ROOT/.env.local" ]] || [[ -n "${FMP_API_KEY:-}" ]]; then
  echo "Refreshing untouched catalog levels (FMP + FvIndustries)…"
  if ! npm run refresh:levels >/tmp/sniper-refresh-levels.log 2>&1; then
    echo "LEVELS_REFRESH_FAILED — not pushing. See /tmp/sniper-refresh-levels.log"
    tail -n 40 /tmp/sniper-refresh-levels.log
    exit 1
  fi
  # refresh writes seed+runtime; re-sync in case other runtime files lagged
  bash "$ROOT/scripts/sync-runtime-to-seeds.sh"
else
  echo "Skipping levels refresh (no FMP_API_KEY / .env.local)"
fi

# Fail fast locally — Netlify keeps the old Published deploy if `next build` errors.
# Concurrent `next dev` corrupts `.next` mid-build (PageNotFoundError / missing chunks).
# Stop local Next first, wipe cache, build; retry once if the flake still appears.
echo "Verifying production build…"
pkill -f "[n]ext dev" 2>/dev/null || true
pkill -f "[n]ext-server" 2>/dev/null || true
sleep 1
rm -rf .next

run_prod_build() {
  npm run build >/tmp/sniper-predeploy-build.log 2>&1
}

if ! run_prod_build; then
  if grep -q "PageNotFoundError\|Cannot find module for page\|Failed to collect page data" /tmp/sniper-predeploy-build.log 2>/dev/null; then
    echo "Stale .next flake detected — cleaning and retrying build once…"
    pkill -f "[n]ext dev" 2>/dev/null || true
    sleep 1
    rm -rf .next
    if ! run_prod_build; then
      echo "BUILD_FAILED — not pushing. See /tmp/sniper-predeploy-build.log"
      grep -E "^(Error:|PageNotFoundError:|Module not found|Type error|Failed to compile|> Build )" /tmp/sniper-predeploy-build.log | tail -n 12 || true
      tail -n 20 /tmp/sniper-predeploy-build.log
      exit 1
    fi
  else
    echo "BUILD_FAILED — not pushing. See /tmp/sniper-predeploy-build.log"
    grep -E "^(Error:|PageNotFoundError:|Module not found|Type error|Failed to compile|> Build )" /tmp/sniper-predeploy-build.log | tail -n 12 || true
    tail -n 20 /tmp/sniper-predeploy-build.log
    exit 1
  fi
fi

echo "Production build OK."

committed=0
if [[ -n "$(git status --porcelain)" ]]; then
  # Never stage secrets, local runtime, or workflow files.
  git add -A
  git reset -- .env .env.local .env.*.local data/.runtime .github/workflows 2>/dev/null || true
  if [[ -z "$(git diff --cached --name-only)" ]]; then
    echo "Nothing safe to commit."
  else
    git commit -m "$(cat <<'EOF'
Deploy latest SNIPER updates to production.

Sync admin desk data into seeds and ship so Netlify serves the current house book and app.
EOF
)"
    committed=1
  fi
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
ahead=0
if git rev-parse --abbrev-ref "@{u}" >/dev/null 2>&1; then
  ahead="$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)"
else
  ahead=1
fi

if [[ "$committed" -eq 0 && "${ahead:-0}" -eq 0 ]]; then
  echo "DEPLOY_SKIPPED"
  exit 0
fi

git push -u origin "$branch"
if git remote get-url fork >/dev/null 2>&1; then
  git push fork "$branch:$branch" || true
fi

# If CLI is logged in, force a production deploy (covers broken Git→Netlify hooks).
if npx --yes netlify-cli status 2>/dev/null | grep -qi 'Logged in'; then
  echo "Netlify CLI logged in — forcing production deploy…"
  if [[ -f .env.local ]]; then
    PW="$(grep -E '^ADMIN_PASSWORD=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
    if [[ -n "${PW}" ]]; then
      npx --yes netlify-cli env:set ADMIN_PASSWORD "${PW}" --force >/dev/null 2>&1 || true
    fi
    FMP="$(grep -E '^FMP_API_KEY=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
    if [[ -n "${FMP}" ]]; then
      npx --yes netlify-cli env:set FMP_API_KEY "${FMP}" --force >/dev/null 2>&1 || true
    fi
  fi
  npx --yes netlify-cli deploy --build --prod --message "deploy-live.sh $(git rev-parse --short HEAD)" || {
    echo "CLI deploy failed — Git push still done; will still verify live catalog."
  }
fi

echo "Verifying live catalog matches this push…"
if ! bash "$ROOT/scripts/verify-live-catalog.sh"; then
  echo "LIVE_STALE — pushed, but https://sniper-proj.netlify.app/ is not serving this catalog yet."
  exit 1
fi

echo "DEPLOY_PUSHED"
echo "LIVE_VERIFIED"
echo "Live site matches local catalog → https://sniper-proj.netlify.app/"
