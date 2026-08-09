#!/usr/bin/env bash
# Sync desk runtime → committed seeds, commit, push to origin (Netlify rebuilds).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/sync-runtime-to-seeds.sh"

committed=0
if [[ -n "$(git status --porcelain)" ]]; then
  # Never stage secrets, local runtime, or workflow files.
  # Workflow pushes need a GitHub token with `workflow` scope; OAuth apps
  # used by gh/git often lack it and reject the whole push.
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
# Only push when we have a new commit or are ahead of origin.
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
# Netlify may be linked to the collaborator fork — keep it in sync.
if git remote get-url fork >/dev/null 2>&1; then
  git push fork "$branch:$branch" || true
fi
echo "DEPLOY_PUSHED"
echo "Pushed $branch → Netlify will rebuild https://sniper-proj.netlify.app/"
