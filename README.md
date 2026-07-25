# SNIPER

Precision stock-portfolio builder. Pick 1–4 famous companies you like; the
Python **Builder** fills the rest to up to 12 with beta-balanced, high-upside
names from your valuation data. Built with Next.js 14 (App Router), TypeScript,
Tailwind CSS, and Recharts.

## Soft launch (friends on Vercel)

See **[SOFT_LAUNCH.md](SOFT_LAUNCH.md)** for deploy env, content sync
(`scripts/sync-runtime-to-seeds.sh`), known limits, and a share blurb.

On Vercel, mock Builder is used automatically (`VERCEL=1`). Locally you can still
run the real Python Builder against StockAnalysis data.

## Getting started

```bash
npm install
pip install -r valuation/requirements.txt
npm run dev
```

Open http://localhost:3000 (user site).

### Admin desk (separate app)

Desk lives in sibling folder [`../SNIPER-DESK`](../SNIPER-DESK) on **port 3001**.
It edits the same `data/` folder, so changes show on the user site immediately.

```bash
# terminal 1 — this user site
npm run dev

# terminal 2 — desk
cd ../SNIPER-DESK && npm install && npm run dev
```

- User: http://localhost:3000  
- Desk: http://localhost:3001 (password default `sniper`, set `ADMIN_PASSWORD`)

User-site env (optional): `NEXT_PUBLIC_DESK_URL=http://localhost:3001`  
Desk env: `SNIPER_DATA_DIR` must point at this repo’s `data/` folder.

### Builder data paths

By default the site runs the Python Builder against local StockAnalysis data:

| Env var | Default |
| --- | --- |
| `SNIPER_FV_DIR` | `~/Documents/StockAnalysis/FvIndustries-0-0-` |
| `SNIPER_UNIVERSE` | `~/Documents/StockAnalysis/NoamShit/extracted_symbols_newest.json` |
| `SNIPER_SHARPE_FILE` | `$SNIPER_FV_DIR/all_stocks_sharpe_ratios.json` |
| `SNIPER_PYTHON` | `python3` |

To skip Python and use the TypeScript mock fill instead:

```bash
SNIPER_USE_MOCK_BUILDER=1 npm run dev
```

See also [`valuation/README.md`](valuation/README.md).

## User flow

1. Landing page shows a single clickable **BUILD**.
2. `/build` — pick **1–4** famous stocks (eligible when model upside ≥ 20%).
3. Builder completes up to 12 holdings (β band 0.5–1.25, fillers ≥ 35% upside)
   and saves the portfolio to `localStorage` (including weight + snapshot fields).
4. Four tabs:
   - **DASHBOARD** — performance chart (1W/1M/1Y), holdings (tap for thesis +
     levels; AI picks may offer a safer/bolder switch when alternatives exist),
     and the top holdings headline.
   - **BREAKING NEWS** — simplified one-line headlines.
   - **IDEAS** — desk-curated single-name theses.
   - **SNIPERS** — the official house portfolio (read-only).
5. **ADMIN** nav opens the desk site (`http://localhost:3001`).

## Admin (SNIPER Desk)

Use the separate desk app (see above). You can edit levels & alternatives, ideas,
breaking news, the Snipers house book, and view the audit log.

Edits persist to `data/.runtime/` (git-ignored), shared with the user site. Seeds
live in `data/*.json`.

## Architecture

- **Portfolio build:** `POST /api/portfolio/build` → `lib/builder/run.ts` →
  `python3 valuation/Builder --pick … --json-stdout`
- **Famous shortlist:** `GET /api/builder/famous` → `--list-famous-json`
- **Other content** (news, ideas, admin levels) still reads through
  `DataProvider` in [`lib/data/index.ts`](lib/data/index.ts) (mock JSON today)

## Project structure

```
app/
  page.tsx                 # landing "BUILD"
  build/                   # famous-stock picker → Builder
  (tabs)/                  # dashboard, breaking-news, ideas, snipers
  admin/                   # redirects to SNIPER-DESK
  api/                     # builder/famous, portfolio/build, public reads …
components/
lib/
  builder/                 # Node↔Python bridge + mapping
  portfolio.ts             # mock fill (SNIPER_USE_MOCK_BUILDER=1 only)
  data/                    # DataProvider + JSON store
valuation/
  Builder                  # Python portfolio engine
  requirements.txt
data/*.json                # seed mock content
```
