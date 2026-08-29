# SNIPER — simple polish backlog (parked)

Saved while you were away. Phase 1 only: beginner clarity, next-step guidance. No accounts / broker. Freeze BUILD + four tabs stays.

## Live status (2026-08-29)

Add-from-StockAnalysis is live on https://sniper-proj.netlify.app/

- Search/lookup works for names outside `stocks.json` (e.g. AAL → provisional levels)
- Refresh the add index anytime with: `npm run sync:add-universe`

---

## Ranked ideas (pick when you return)

1. ~~**Landing sells levels**~~ **Done** — Tagline names buy / sell / exit.  
   `app/page.tsx`, `lib/i18n.ts`, `app/layout.tsx`

2. ~~**Returning users: YOURS first**~~ **Done** — With a saved book, primary CTA → dashboard; BUILD explicit.  
   `app/page.tsx`

3. ~~**Wire PICK FOR ME**~~ **Done** — One-tap pick eligible logos.  
   `app/build/page.tsx`, `lib/i18n.ts`

4. **Calmer build on mobile** — One primary BUILD CTA (sticky); demote duplicate header button.  
   `app/build/page.tsx`

5. ~~**Richer YOURS empty state**~~ **Done** — Explain fill-to-12 + levels, then GET STARTED.  
   `app/(tabs)/dashboard/page.tsx`, `lib/i18n.ts`

6. ~~**Guest trust chip on YOURS**~~ **Done** — Dismissible “saved in this browser · not a broker”.  
   Dashboard + i18n

7. ~~**Ideas / HOUSE empty CTAs**~~ **Done** — Link to BUILD / YOURS / HOUSE; reinforce HOUSE ≠ yours.  
   Ideas + snipers pages

8. **Mobile nav labels** — Short labels that still say your book vs desk book.  
   `components/TabNav.tsx`

9. **LevelInfo tips on mobile** — `(i)` popovers clip on small screens; flip/clamp or sheet.  
   `components/LevelInfo.tsx`

10. **Risk panel tone + i18n** — Drop roadmap-y “full product would suggest…” voice.  
    `components/PortfolioRiskPanel.tsx`

11. **i18n leftover English** — Build progress / style picker / “Portfolio ready” still hardcoded.  
    `components/BuildOptionPicker.tsx`, `app/build/page.tsx`

---

## Suggested next ship

Do **#4 + #9 + #10**: calmer mobile build CTA, LevelInfo mobile tips, risk panel tone.
