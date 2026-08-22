# SNIPER positioning

## One-liner

SNIPER helps beginner and intermediate investors build a diversified portfolio with clear buy / sell / exit levels—without copying traders or chasing lagged filings.

## Who it’s for

- Primary: beginner → intermediate retail
- Not for: social copy traders, politician-filing followers, high-frequency active traders

## Who we are not (non-goals)

- No copy-trading / follow-a-creator
- No politician / Form 4 lag products
- No native brokerage (broker APIs only later, after accounts)
- No tax-loss harvesting product until assets are custodied
- No Autopilot-style $120–200/yr “automation fee” as the core offer

## Locked decisions

| Topic | Decision |
| --- | --- |
| Segment | Beginner / intermediate |
| Money | Phase 1 ideas/levels → Phase 2 accounts + real P&L → Phase 3 broker API |
| Monetization | Freemium (free core; paid later for sync/alerts/premium desk) |
| Copy-trading | Explicit non-goal |

## Money movement (sequenced)

Do **both** ideas and brokerage over time—not in one rewrite:

1. **Phase 1 (now):** Ideas / levels / education — what already ships
2. **Phase 2:** Accounts + real performance vs entry (still no execution)
3. **Phase 3:** Broker API (Alpaca-class) for optional order sync — additive module; guest + desk flows stay

## Monetization (freemium)

Why freemium: matches the free BUILD → dashboard soft launch, avoids Autopilot-style fee walls, and lets paid unlocks arrive after accounts exist.

- **Free:** BUILD, portfolio, news, ideas, snipers, local save
- **Paid (later):** account sync, alerts on EP/TP/SL, premium desk Ideas — not copy-trading

Not yet: AUM fees (need custody) or high annual “automation only” subscriptions.

## Freeze — do not rip out

- BUILD → famous picks → fill-to-12
- Tabs: Dashboard, News, Ideas, Snipers
- EP / TP / SL + plain-English thesis
- Admin desk (`/admin`)
- Seed/runtime JSON data seam
- Soft-launch guest portfolio (browser save)

## Build-without-breaking rules

1. One product bet at a time
2. Dual-path / fallback until the new path is proven
3. Extend data shapes; don’t break seed JSON without a migration
4. Admin remains source of truth for levels / ideas / news
5. `npm run build` must stay green before every ship

## Add only as layers (90 days, in order)

1. Guardrail storytelling (polish existing levels/thesis)
2. Two-option build (Broad vs Growth); keep single-build fallback
3. Dashboard risk panel (concentration / simple stress)
4. Optional accounts (guest mode remains)
5. Broker API: design only until Phase 2 is real

## Feature check (every PR)

Does this break BUILD, the four tabs, admin, or seed JSON shapes?  
If yes → redesign as an additive layer or drop it.

## vs Alinea / dub / Autopilot

We win on guided portfolios with explicit exits and desk curation—not on mirroring people or lagged public filings.

| Their gap | Our near-term answer | Not yet |
| --- | --- | --- |
| Blind copy | Desk EP/TP/SL + thesis | Creator mirroring |
| Filing lag | Publish when the desk is ready | Politician Autopilot clone |
| No hybrid core/satellite | Two build options (broad vs growth) | Live auto-rebalance engine |
| Tax drag | Plain-English awareness only | TLH product |
| High fees | Free / freemium | $120–200/yr automation fee |
