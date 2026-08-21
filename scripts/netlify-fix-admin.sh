#!/usr/bin/env bash
# Fix live admin: link Netlify site, set ADMIN_PASSWORD, clear-cache prod deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npx --yes netlify-cli status 2>/dev/null | grep -qi 'Logged in'; then
  echo "Not logged into Netlify CLI. Run: npx netlify-cli login"
  exit 1
fi

PW="$(
  grep -E '^ADMIN_PASSWORD=' .env.local 2>/dev/null \
    | head -1 \
    | cut -d= -f2- \
    | sed -e 's/^["'\'']//' -e 's/["'\'']$//' \
    | tr -d '\r'
)"
if [[ -z "${PW}" ]]; then
  echo "ADMIN_PASSWORD missing from .env.local"
  exit 1
fi

# Prefer existing site name if already linked; otherwise try sniper-proj.
SITE_ID="$(npx --yes netlify-cli api listSites --data '{}' 2>/dev/null \
  | node -e '
    let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
      try {
        const sites=JSON.parse(s);
        const hit=(sites||[]).find(x =>
          (x.name||"").includes("sniper") ||
          (x.ssl_url||"").includes("sniper-proj") ||
          (x.url||"").includes("sniper-proj")
        );
        if (hit) console.log(hit.id||"");
      } catch { /* ignore */ }
    });
  ' || true)"

if [[ -n "${SITE_ID}" ]]; then
  echo "Linking site id ${SITE_ID}"
  npx --yes netlify-cli link --id "${SITE_ID}"
else
  echo "Could not auto-find sniper-proj — run: npx netlify-cli link"
  npx --yes netlify-cli link
fi

echo "Setting ADMIN_PASSWORD on Netlify (all scopes)…"
npx --yes netlify-cli env:set ADMIN_PASSWORD "${PW}" --force

echo "Production deploy (build)…"
npx --yes netlify-cli deploy --build --prod --message "Fix admin login + password env"

echo "Done. Open https://sniper-proj.netlify.app/admin"
