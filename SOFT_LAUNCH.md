# Soft-launch guide (friends / testers)

## Production

**Live URL:** https://sniper-proj.netlify.app/

Git push to `main` on PachUp/SNIPER redeploys Netlify. From this repo:

```bash
npm run deploy:live   # sync runtime→seeds, commit, push
```

Admin desk edits also mirror into `data/*.json` automatically when saving locally.

---

## Deploy (Vercel alternative)

Vercel CLI needs a one-time login on this Mac:

```bash
cd /Users/noambelinkis/Documents/SNIPER
npx vercel login          # browser login
./scripts/deploy-vercel.sh
```

Or: push this repo to GitHub → [vercel.com/new](https://vercel.com/new) → import → set env vars below → Deploy.

Paste the production URL into [SHARE_BLURB.md](SHARE_BLURB.md).

## What this launch is
- Shareable Vercel URL for friends
- Portfolios stay in each browser (`localStorage`) — no accounts
- Portfolio fill uses the **mock Builder** on Vercel (not live Fv / Python)
- Legal pages are **draft** — friends-only, not a public product launch

## Env (Vercel project)
Set in the Vercel dashboard → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `SNIPER_USE_MOCK_BUILDER` | `1` |
| `NEXT_PUBLIC_SOFT_LAUNCH` | `1` |

(`VERCEL=1` is set automatically and also forces mock Builder.)

## Content workflow (desk → live site)

Desk must run **locally** for soft launch (file writes do not persist on Vercel).

```bash
# 1) Edit on the desk
cd ../SNIPER-DESK && npm run dev   # http://localhost:3001

# 2) Copy runtime edits back into committed seeds
cd ../SNIPER
./scripts/sync-runtime-to-seeds.sh

# 3) Ship
git add data/*.json
git commit -m "Update seed content"
git push   # Vercel redeploys; friends see changes in ~1–2 min
```

If `data/.runtime` is empty/missing, edit `data/*.json` directly instead.

## Known limits (tell testers)
- Draft product; not investment advice
- No login — clearing site data loses their portfolio
- Server-side fill is illustrative/mock (not live valuation Builder)
- Content updates require a redeploy after you sync seeds

## Share blurb (copy/paste)

```
Hey — trying a draft of SNIPER (stock portfolio helper). Feedback welcome.

URL: <YOUR_VERCEL_URL>

Please:
1) Accept the consent screen
2) BUILD → pick 1–4 famous stocks → build portfolio
3) Check Dashboard / Breaking News / Ideas / Snipers

Notes: friends/testers only; not investment advice; legal text is draft;
your portfolio is saved only in this browser.
```

## Later (not this soft launch)
User accounts, cloud DB, live Python Builder hosting, attorney-final legal, hosted desk.
