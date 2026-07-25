SNIPER – Requirements Document (End-to-End)
Version 2.3

────────────────────────────────────────
How to read this document
────────────────────────────────────────

This describes SNIPER for two audiences: the end user (beginner investor) and the admin (the SNIPER desk that publishes recommendations). It also defines how the valuation software will feed the site.

Status tags used throughout:
• Built – exists in the current site today
• Proposed – required for the target product, not yet built
• Open – decision still needed (also listed at the end under Open Items)

────────────────────────────────────────
1. Product Vision
────────────────────────────────────────

SNIPER’s goal is to make investing easier than users thought imaginable. A complete beginner should be able to go from zero to a sensible, diversified portfolio in about a minute, understand every decision in plain language, and be guided over time with clear, actionable alerts.

The desk (admin) curates all recommendations. The user picks what resonates and follows along.

────────────────────────────────────────
2. Foundational Assumptions
────────────────────────────────────────

1. User accounts (Proposed)
   Because SNIPER tracks each user’s real positions and sends personalized alerts, users sign in with email/password plus Google/Apple social login. (The current build stores a single portfolio in the browser with no login — that is superseded by accounts.)

2. Single admin role (Built)
   One password-protected admin curates all editable content (ADMIN_PASSWORD, 8-hour session cookie).

3. Levels are admin-only (Built)
   Buy / Sell target / Safety exit prices (internally EP / TP / SL) are shown everywhere but can only be set or changed by the admin.

4. Plain-language principle (Built)
   User screens avoid jargon. Risk is shown as Low / Medium / High, never a raw volatility number.

5. Single data-source seam (Built)
   Every screen reads through one interface (DataProvider). Today it is mock JSON; later, the valuation software (Section 5).

6. Content persistence (Built)
   Seed content lives in /data/*.json; admin edits go to a runtime store so seeds stay clean.

7. Audit log (Built / Proposed)
   Every admin change records timestamp, action, and details. Attaching per-admin identity (who) comes later once multi-admin / 2FA exists.

8. Performance: hybrid (Proposed)
   Charts show illustrative performance on mock data, and real performance (from each holding’s entry price to the live price) once the data source is connected.

9. Compliance / financial-advice framing (Open)
   Requires legal review. Until resolved, the site shows a clear disclaimer and treats content as general information, not personalized advice (see Section 8).

Core definitions & formulas
• Growth potential (Upside %) = (Fair Value − Current Price) / Current Price
• Risk level from beta: Low if beta < 0.8, Medium if 0.8–1.2, High if beta > 1.2 (Built)
• AI eligibility: a stock may be auto-added only if growth potential ≥ 15% (Built)
• Portfolio size: **1–4** user “famous” picks; completed to up to **12** total by the Python Builder (Built)
• Whole shares only (Proposed): position value in shares = amount allocated ÷ current price, rounded down to whole shares; remainder stays as uninvested cash
• Market coverage (Proposed): SNIPER covers whatever universe the valuation software provides

────────────────────────────────────────
3. Part A – End-User Experience
────────────────────────────────────────

Persistent top navigation:
DASHBOARD | BREAKING NEWS | IDEAS | SNIPERS (+ ADMIN entry point)

3.0 Accounts & Onboarding (Proposed)

3.0.1 Sign-in
Email/password plus Google/Apple. Standard sign-up, sign-in, sign-out, and password reset. Sign-up requires the user to be 18+. Each account owns exactly one portfolio (no multiple/named portfolios).

3.0.2 Risk questionnaire
A very short quiz (2 questions), each with 3 answer choices:
• Time horizon – short / medium / long
• Risk tolerance – cautious / balanced / bold

Answers bias the build engine (e.g. shorter horizon / cautious → steadier, lower-volatility tilt; longer horizon / bold → more growth-tilted).

Onboarding order: risk quiz first, then picking stocks, then choosing an option. Exact scoring mapping (how answers translate to each option) remains Open.

3.0.3 Beginner guidance (Proposed)
Minimal, just-in-time help: a few key tooltips at first use (e.g. what “Buy around / Sell target / Safety exit” and “risk level” mean). No full course or heavy glossary.

3.1 Build Flow

3.1.1 Landing (Built)
A single clickable BUILD with the tagline: “Create a smart stock portfolio in under a minute. No experience needed.” Signed-in users with an existing portfolio also see “SEE MY PORTFOLIO →”.

3.1.2 Pick primary stocks (Built)
The user picks **1–4 famous stocks** from the Builder shortlist (household names with model upside ≥ 20% today). Each card shows ticker, sector/industry, growth potential (%), and a plain-language risk level. Stocks below the bar are shown as “not eligible today.” Free search across the full universe is not offered.

3.1.3 Generate two portfolio options (Proposed)
After the picks (and risk quiz), SNIPER builds two complete 12-stock portfolios — both include the user’s primary picks and both fit the user’s risk profile — that differ in exposure. Presented side-by-side with key differences, for example:
• Option A – Broad & Balanced: spread across more of the 11 sectors; steadier
• Option B – Growth-Tilted: concentrated in major growth areas/themes (e.g. technology/AI, energy transition, healthcare innovation); higher potential, higher risk

For each option the comparison shows: sector mix, growth areas emphasized, overall risk level (Low/Med/High), and combined growth potential. Both options always include every one of the user’s primary picks — they differ only in the stocks added to complete the 12. Primary differentiator is diversification (broad vs. concentrated growth). Growth areas/themes are chosen by the valuation software, not hard-coded. Exact labels and how the risk-quiz answers map to each option are Open.

3.1.4 Choose one (Proposed)
The user selects Option A or B; that becomes their portfolio.

3.1.5 Position sizing (Proposed)
The user enters a single total amount to invest; SNIPER suggests how to split it across the 12 holdings. Values can display as dollars or number of shares (toggle). Shares are whole shares only; leftover is shown as uninvested cash. Fine-tuning the suggested split is a Proposed nicety.

3.1.6 Fill-to-12 engine (Built — Python Builder; two-option variant Proposed)
The website calls `valuation/Builder` (pick mode) against local FvIndustries data. Completion adds diversified fillers with model upside ≥ 35%, keeps portfolio β in 0.5–1.25, and assigns weights (picks capped, auto-fill tilted by Sharpe). Results include per-holding weights and a snapshot so the dashboard can render without mock stocks.json. Set `SNIPER_USE_MOCK_BUILDER=1` to use the old TypeScript mock instead.

3.2 DASHBOARD tab (Built, with Proposed additions)

• Top-left – How you’re doing: performance line chart with 1W / 1M / 1Y toggle and a headline “% since you started” (hybrid: illustrative now, real once connected). Built / Proposed
• Top-right – Your stocks: 12 holding cards, each with ticker + name, “Our pick” / “Your pick” tag, growth potential, Buy / Sell / Exit levels, and (AI picks only) the safer ↔ bolder switch. Tapping a card opens the stock detail popup. Built
  – Position value per holding ($ or shares): Proposed
• Bottom – Latest news about your stocks: the single most relevant holdings-related headline as a Good/Bad line that opens the news popup. Built
• Rebalance prompts: when the desk changes a stock’s levels or the house portfolio, the user is notified and offered a suggested adjustment. Proposed
• Action: “Start over” rebuilds the portfolio. Built

3.2.1 Safer ↔ Bolder switch (Built)
On AI picks only; cycles through admin-approved same-sector alternatives ordered by risk (left = safer, right = bolder). Users can never switch to a non-approved stock. The valuation software suggests same-sector candidates; the admin approves which ones appear.

3.2.2 Stock detail popup (Built)
Shows ticker, name, sector, growth potential, plain-language risk level, today’s price, the reasoning, and the three levels with a one-line “how to use them” explanation.

3.2.3 Ongoing portfolio management (Proposed)
• Level hits: when a holding reaches Sell target or Safety exit, SNIPER notifies the user and suggests an action (sell / hold), and the sale is auto-recorded to history at that level
• After a sell or exit: SNIPER suggests a same-profile replacement to refill the slot and keep the portfolio at 12
• Editing: users can add or remove holdings at any time (not only via the safer/bolder switch)
• Desk-change prompts: when the admin updates a stock’s levels or the house portfolio, affected users are notified with a suggested adjustment

3.3 BREAKING NEWS tab (Built)
• Feed of one-sentence, plain-language headlines, newest first, tagged GOOD NEWS (green) / BAD NEWS (red). Filter: All / Good / Bad
• News popup (Built): Good/Bad tag, headline, a short beginner-friendly “why it matters” elaboration, related companies, and “Read full story →”

3.4 IDEAS tab (Built, action Proposed)
• Admin-curated single-company ideas: ticker, name, sector, growth potential, plain-language thesis, and the three levels
• Actionable (Proposed): each idea has a one-tap “add to my portfolio / track this” action

3.5 SNIPERS tab – house portfolio (Built, tracking Proposed)
• The official SNIPER house portfolio: performance chart plus each holding with weight (%), reasoning, and the three levels. Read-only for users
• Tracking is hybrid: illustrative on mock data; real once connected (Proposed)
• Copy to my portfolio (Proposed): a one-tap action to adopt the house portfolio as the user’s own

3.6 Notifications (Proposed)
Users receive push + email notifications for:
• a holding hits its Buy / Sell / Exit price
• breaking news about one of their holdings
• a new idea is published
• the house portfolio (SNIPERS) changes
• a weekly performance summary (total value & % change, best and worst performer, recap of key news on holdings)

Delivery via an installable web app (PWA) first; native mobile later. Users should be able to toggle each category; per-category opt-out and quiet hours are Open.

3.7 History & performance basis (Proposed)
• Transaction history: buys and sells with realized gains/losses
• Total return: performance figures include dividends (not price change alone)
• Price cadence: prices update end-of-day (once per day)
• Tracking anchor (Open): how a position’s cost basis is set — assume the price at the moment it’s added vs. the user entering the actual buy price/date vs. broker sync
• No benchmark comparison: the dashboard shows the user’s own return only (no S&P 500 / index overlay)

3.8 Support & help (Proposed)
In-app help / FAQ only. No live chat or ticketing in scope for now.

────────────────────────────────────────
4. Part B – Admin Back Office (single admin) — separate desk site
────────────────────────────────────────

The admin UI runs as a separate app (`SNIPER-DESK` on port 3001 by default). It shares the same `SNIPER_DATA_DIR` / `data/.runtime` as the user site, so saves publish instantly. The user site’s ADMIN link opens the desk; desk VIEW SITE opens the public app.

4.0 Authentication (Built)
• Desk home `/`; password screen when logged out; 8-hour session cookie; every save endpoint re-verifies the session
• Proposed, later: 2FA + 10-minute inactivity timeout (planned, not near-term)

4.1 Levels & Alternatives editor (Built)
• Lists every stock with a filter. Editable per stock: Buy (EP), Sell target (TP), Safety exit (SL) and the approved alternatives list. Save per stock
• Proposed validations: enforce Sell target > Buy > Safety exit; each alternative must be the same sector
• Proposed alternatives sourcing: valuation software suggests same-sector candidates; admin approves which ones appear in the switch

4.2 Ideas editor (Built)
Add / edit / remove ideas (ticker, name, sector, growth potential, thesis, levels). Save all.

4.3 Breaking News editor (Built)
Add / edit / remove headlines: tickers, sentiment, source, URL, one-line headline, and the Details text for the popup. Save all.

4.4 Snipers house-portfolio editor (Built)
Edit portfolio name and each holding (ticker, name, sector, weight %, reasoning, levels). Add / remove holdings. Save all (auto-stamped “updated” date).

4.5 Persistence & audit (Built)
• Saves go through the data provider to the store
• Each save appends an audit entry (timestamp / action / details); viewable under Admin → Audit Log (last 500 entries). Per-admin identity on each entry is Proposed for later

────────────────────────────────────────
5. Part C – Data Integration (Valuation Software Seam)
────────────────────────────────────────

**Portfolio build (Built):** the Python Builder in `valuation/Builder` is live. The Next.js API spawns it with `--pick` / `--list-famous-json` and reads FvIndustries + Sharpe + universe JSON via env paths (`SNIPER_FV_DIR`, `SNIPER_UNIVERSE`, `SNIPER_SHARPE_FILE`).

**Other content:** news, ideas, admin levels, and the house book still read/write through the DataProvider interface (mock JSON today). To go live for those, implement the same interface against the valuation software and swap one export.

Per-stock fields from the Builder / software:
ticker, sector/industry, current price, fair value, growth potential (%), volatility (beta), Sharpe, weights, and famous-pick eligibility.

Still delegated later: two-option selection, real performance time-series, breaking-news source + summaries, and syncing admin EP/TP/SL from Fv data.

Integration contract: data refreshes end-of-day (once per day) (Proposed). Full REST API vs shared DB for non-Builder content remains Open.

────────────────────────────────────────
6. Part D – Producer / User View Details
────────────────────────────────────────

6.1 Terminology map (jargon → what the user sees) (Built)

Internal / market term          →  Shown to the user
Entry price (EP)                →  Buy around
Take profit (TP)                →  Sell target
Stop loss (SL)                  →  Safety exit
Beta (volatility)               →  Risk level: Low / Medium / High
Sharpe ratio                    →  (hidden on user screens)
Upside %                        →  Growth potential
AI-selected holding             →  “Our pick”
User-selected holding           →  “Your pick”

6.2 Two-option comparison fields (Proposed)
For each of Option A / Option B, show: name/label, overall risk level, combined growth potential, sector mix, growth areas emphasized, and how it differs from the other option in one line. Primary differentiator is diversification (broad vs. concentrated growth).

6.3 States used across the site
• Holding source: Your pick / Our pick (AI) / Swapped-to-alternative
• AI eligibility: Eligible (growth ≥ 15%) / Not eligible
• News sentiment: Good / Bad
• Admin save state: Idle / Saving / Saved / Error
• Alert state per holding (Proposed): below Buy / in range / near Sell target / near Safety exit
• Content publishing: admin edits publish instantly (no draft/review step)

────────────────────────────────────────
7. Per-Screen Reference
────────────────────────────────────────

PUBLIC SITE

Sign-in (Proposed)
• Inputs: Email/password; Google/Apple
• Shown: Auth errors
• Actions: Sign up / in / out; reset password

Risk quiz (Proposed)
• Inputs: Time horizon; risk tolerance
• Shown: Progress
• Actions: Answer; continue

Landing (Built)
• Shown: Existing-portfolio link (conditional)
• Actions: BUILD

Build – pick (Built)
• Inputs: Famous shortlist; 1–4 picks
• Shown: Ticker, sector/industry, growth potential, risk level; picks counter; ineligible list
• Actions: Pick/unpick; Build my portfolio

Build – choose option (Proposed)
• Shown: Option A vs B — risk level, growth potential, sector mix, growth areas, key difference
• Actions: Select an option

Build – size (Proposed)
• Inputs: Total amount; $/shares toggle
• Shown: Suggested split per holding
• Actions: Confirm / fine-tune

Dashboard (Built + Proposed)
• Inputs: Chart range 1W/1M/1Y
• Shown: Performance %; 12 holdings with source tag, growth potential, Buy/Sell/Exit, position value; top news line; rebalance prompts
• Actions: Tap stock; safer/bolder switch (AI); Start over

Breaking News (Built)
• Inputs: Filter All/Good/Bad
• Shown: Good/Bad tag; headline; Details cue
• Actions: Open news popup; Read full story

Ideas (Built + Proposed)
• Shown: Ticker, name, sector, growth potential, thesis, Buy/Sell/Exit
• Actions: Add to my portfolio (Proposed)

Snipers (Built + Proposed)
• Inputs: Chart range
• Shown: Performance; holdings with weight %, reasoning, Buy/Sell/Exit
• Actions: Copy to my portfolio (Proposed)

History (Proposed)
• Inputs: Date range
• Shown: Past buys/sells; realized gain/loss; total return
• Actions: View only

ADMIN BACK OFFICE

Login (Built)
• Inputs: Password
• Shown: Error on wrong password
• Actions: Enter

Levels & Alternatives (Built)
• Inputs: Filter box
• Shown: Per-stock Buy/Sell/Exit, alternatives; save state
• Actions: Edit; Save per stock

Ideas (Built)
• Shown: Ticker, name, sector, growth potential, thesis, levels; save state
• Actions: Add / Edit / Remove; Save all

Breaking News (Built)
• Shown: Tickers, sentiment, source, URL, headline, details; save state
• Actions: Add / Edit / Remove; Save all

Snipers book (Built)
• Shown: Name; per-holding ticker/name/sector/weight/reasoning/levels; save state
• Actions: Add / Edit / Remove; Save all

Audit Log (Built)
• Shown: When / Action / Details (newest first; last 500)
• Actions: Refresh

────────────────────────────────────────
8. Non-Functional & Platform
────────────────────────────────────────

• Platform (Proposed): Responsive web now, delivered as an installable PWA to support web push; native iOS/Android app later
• Launch markets (Proposed): United States and Israel first (both carry regulatory implications — see Compliance)
• Localization (Built / add-on): English is the primary language of the product (default, content, and legal). Hebrew is an optional UI add-on (toggle + RTL chrome only) — not a second equal product surface. News, ideas, and stock write-ups stay English unless separately localized later
• Performance data (Proposed): Hybrid until the valuation software is connected (illustrative), then real. Prices refresh end-of-day; performance is total return (includes dividends). No benchmark overlay
• Data availability fallback (Proposed): If the valuation software is temporarily unavailable, show the last known data with an “as of” timestamp
• Analytics (Proposed): Standard product analytics to improve the experience (subject to privacy handling below)
• Accessibility: Good/Bad news carry a text label in addition to color (Built); a formal target (e.g. WCAG 2.1 AA) is Open
• Visual style: Working direction — clean and friendly but precise; final visual direction is Open
• Out of scope for now: benchmark comparison, portfolio sharing, referral program, live chat support

────────────────────────────────────────
9. Compliance & Data Privacy
────────────────────────────────────────

Status: Open – legal review required

• Financial-advice framing (general information vs personalized advice) and licensing implications must be reviewed by legal, for both the US and Israel
• Sign-up is 18+
• User accounts introduce personal data and (with tracking) financial data; storage, consent, and privacy handling must be defined. Self-serve data export / account deletion is Open (pending legal)
• A clear disclaimer must appear on recommendation surfaces until resolved

9.1 Legal & Compliance — Product-Side Protections

These are product/engineering safeguards to reduce legal exposure. They are not a substitute for legal counsel. All placeholder wording must be reviewed and finalized by a qualified attorney before launch.

Implemented now (Built)
• Persistent “not investment advice” disclaimer in the site footer across all main tabs (Dashboard, Breaking News, Ideas, Snipers), stating SNIPER is general information, is not a broker/adviser, does not execute trades or hold funds, and that investing carries risk of loss
• Short not-advice line inside the stock reasoning pop-up and the news pop-up
• First-visit consent gate (blocking modal) requiring the user to (a) confirm they are 18+ and (b) acknowledge the content is not investment advice and agree to the Terms, Privacy Policy, and Disclaimer. Acceptance is stored locally. The gate is skipped on legal pages (so they are readable)
• Placeholder legal pages at /legal/disclaimer, /legal/terms, and /legal/privacy, each clearly banner-marked as non-binding placeholder text for the attorney to finalize. Linked from the footer and the consent gate
• Admin audit log — every admin change (levels, alternatives, ideas, news, house portfolio) is recorded with timestamp, action, and details, viewable in the admin panel under “Audit Log” (retains the last 500 entries)

To finalize with counsel (Open)
• Final disclaimer / risk-disclosure wording and jurisdiction-specific disclosures (US and Israel)
• Terms of Service (governing law, arbitration/dispute resolution, liability caps) and Privacy Policy (legal bases, retention, transfers, GDPR / Israeli Privacy Protection Law / US state rights, self-serve export & deletion)
• Whether any activity requires registration/licensing as an adviser/broker in the target markets, and the resulting framing constraints
• Recording consent server-side per account (currently client-side only, pre-auth)
• Attaching admin identity to audit entries once per-admin accounts / 2FA exist (today the admin is a single shared password)

────────────────────────────────────────
10. Open Items (to close)
────────────────────────────────────────

1. Compliance / legal review (US + Israel) – advice framing, disclaimers, licensing, and data privacy (including self-serve export/deletion) for accounts and tracked positions

2. Valuation software connection method – REST API vs shared DB/file, and how “which stocks to present per context” is decided (refresh cadence resolved: end-of-day)

3. Trade-tracking cost basis – how a position’s starting price is set: add-time price vs. user-entered buy price/date vs. broker sync

4. Two-option build – exact labels and how the risk-quiz answers map to each option (primary axis resolved: diversification)

5. Notification preferences – per-category opt-out and quiet hours

6. Accessibility target – confirm whether to commit to WCAG 2.1 AA

7. Final visual style / branding direction

────────────────────────────────────────
11. Already decided (resolved)
────────────────────────────────────────

• Onboarding order: quiz first
• Single portfolio per user
• Curated stock shortlist
• Alternatives sourcing: software suggests → admin approves
• Content publishing: instant
• Alert channels: push + email
• Admin 2FA: planned later
• Ideas / House actionability: yes (Proposed)
• Transaction history: yes
• Total return: yes (includes dividends)
• Pricing: end-of-day
• Age gate: 18+
• Launch markets: US + Israel
• Language: English primary; Hebrew optional UI add-on only
• Product-side legal protections: disclaimers, consent gate, placeholder legal pages, admin audit log
