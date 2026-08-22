#!/usr/bin/env bash
# Sync desk runtime → committed seeds, verify build, commit, push (Netlify rebuilds).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/sync-runtime-to-seeds.sh"

# Fail fast locally — Netlify keeps the old Published deploy if `next build` errors.
echo "Verifying production build…"
npm run build >/tmp/sniper-predeploy-build.log 2>&1 || {
  echo "BUILD_FAILED — not pushing. See /tmp/sniper-predeploy-build.log"
  tail -n 40 /tmp/sniper-predeploy-build.log
  exit 1
}

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
  fi
  npx --yes netlify-cli deploy --build --prod --message "deploy-live.sh $(git rev-parse --short HEAD)" || {
    echo "CLI deploy failed — Git push still done; check Netlify Deploys UI."
  }
fi

echo "DEPLOY_PUSHED"
echo "Pushed $branch → https://sniper-proj.netlify.app/ (confirm new deploy is Published in Netlify)"
