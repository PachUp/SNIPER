#!/usr/bin/env bash
# Sync desk runtime → committed seeds, commit, push to origin (Netlify rebuilds).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/sync-runtime-to-seeds.sh"

if [[ -n "$(git status --porcelain)" ]]; then
  # Never stage secrets, local runtime, or workflow files.
  # Workflow pushes need a GitHub token with `workflow` scope; OAuth apps
  # used by gh/git often lack it and reject the whole push.
  git add -A
  git reset -- .env .env.local .env.*.local data/.runtime .github/workflows 2>/dev/null || true
  if [[ -z "$(git diff --cached --name-only)" ]]; then
    echo "Nothing safe to commit."
    exit 0
  fi
  git commit -m "$(cat <<'EOF'
Deploy latest SNIPER updates to production.

Sync admin desk data into seeds and ship so Netlify serves the current house book and app.
EOF
)"
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
git push -u origin "$branch"
# Netlify may be linked to the collaborator fork — keep it in sync.
if git remote get-url fork >/dev/null 2>&1; then
  git push fork "$branch:$branch" || true
fi
echo "Pushed $branch → Netlify will rebuild https://sniper-proj.netlify.app/"
