#!/usr/bin/env bash
# One-time: npx vercel login
# Then: ./scripts/deploy-vercel.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying SNIPER to Vercel (production)…"
npx --yes vercel@34 deploy --prod --yes --name sniper \
  --env SNIPER_USE_MOCK_BUILDER=1 \
  --env NEXT_PUBLIC_SOFT_LAUNCH=1

echo ""
echo "In Vercel Dashboard → Project → Settings → Environment Variables, confirm:"
echo "  SNIPER_USE_MOCK_BUILDER=1"
echo "  NEXT_PUBLIC_SOFT_LAUNCH=1"
echo "Then paste the production URL into SOFT_LAUNCH.md / SHARE_BLURB.md"
