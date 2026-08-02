#!/usr/bin/env python3
"""Rewrite SNIPER entry theses in DIS-style salesman voice.

Uses FvIndustries fundamentals (vs industry peers) + Breaking News hooks.
Never emits the old "normalized earnings / sector tailwinds" boilerplate.
"""

from __future__ import annotations

import glob
import json
import math
import statistics
from pathlib import Path

SNIPER = Path("/Users/noambelinkis/Documents/SNIPER")
FV_DIR = Path("/Users/noambelinkis/Documents/StockAnalysis/FvIndustries-0-0-")
NOAM_BLURBS = Path(
    "/Users/noambelinkis/Documents/StockAnalysis/NoamShit/company_blurbs.json"
)

# Hand-tuned conviction lines for names with clear public narratives.
# These override the auto generator when present (still use live upside %).
CUSTOM_HOOKS: dict[str, str] = {
    "DIS": (
        "Parks pricing stays firm and the Kraft Heinz themed-dining deal pushes "
        "per-guest spend higher while Disney+ losses keep narrowing"
    ),
    "NFLX": (
        "Ad tier and paid-sharing keep lifting what each subscriber pays, even after "
        "a post-earnings selloff on slower growth optics; buybacks are running hard"
    ),
    "UBER": (
        "Ride and delivery fees are rising, and the Delivery Hero bid would grow "
        "Uber Eats in Europe if regulators clear it"
    ),
    "DASH": (
        "More restaurants and more ads on the app are lifting profits as people "
        "keep ordering food online"
    ),
    "T": (
        "Wireless and fiber cash paid for a bigger stock buyback — about $10B after "
        "a clean earnings beat — so more cash is going back to owners"
    ),
    "V": (
        "Card spending near World Cup cities jumped about 20%, a clean reminder "
        "that travel and big events still feed Visa's fees"
    ),
    "XOM": (
        "Oil back above $100 helps Exxon make more cash from pumping, while it "
        "keeps paying owners through buybacks and the dividend"
    ),
    "CVX": (
        "Higher oil prices and a careful upstream portfolio support cash returns "
        "even when refining margins wobble"
    ),
    "JPM": (
        "Interest income is holding up as the Fed stays on hold, and deal fees are "
        "recovering — JPMorgan still looks like the strongest big bank this cycle"
    ),
    "BAC": (
        "Deposits and consumer loans are the swing factors into the Fed decision; "
        "a soft landing would help money-center banks re-rate"
    ),
    "META": (
        "Reels ads and AI ad tools are lifting profits, even as markets punish "
        "big tech spend in risk-off sessions"
    ),
    "MSFT": (
        "Cloud (Azure) and AI-linked demand remain the growth engine; the debate "
        "is how fast the huge spending pays back, not whether demand is real"
    ),
    "AAPL": (
        "Services and the huge installed base cushion hardware cycles; AI features "
        "are the next way to earn more from each device owner"
    ),
    "AMZN": (
        "AWS cloud growth plus tighter retail costs are the twin earnings drivers — "
        "AI capacity spend is the overhang, not the demand"
    ),
    "GOOGL": (
        "Search and YouTube ads still throw off the cash that funds Cloud and AI — "
        "the market is pricing execution risk, not a dead franchise"
    ),
    "TSLA": (
        "Car volume, energy storage, and self-driving optionality remain the stacked "
        "story; near-term trading is about deliveries and margins"
    ),
    "NVDA": (
        "Data-center chips are still the scarce asset in AI buildouts; the debate "
        "is how long big cloud buyers keep spending, not who leads the product"
    ),
    "CMCSA": (
        "Broadband and NBCU cash fund the dividend while streaming losses narrow — "
        "cable customer loss is the risk, not the media assets"
    ),
    "ROKU": (
        "More streaming hours mean more ads and platform fees — that is how Roku "
        "turns attention into money"
    ),
    "SPOT": (
        "Higher prices for Premium users and better margins show Spotify can earn "
        "more from listening without only chasing new subscribers"
    ),
    "BA": (
        "737 MAX deliveries and defense cash are the recovery spine — hitting "
        "production targets is what rebuilds trust in Boeing's earnings"
    ),
    "HAL": (
        "When oil is high, oilfield work picks up; Halliburton's international mix "
        "helps if US fracking slows"
    ),
    "FLR": (
        "A big engineering backlog and energy-transition projects can support "
        "revenue for years if projects stay on track"
    ),
    "DAL": (
        "Premium seats and strong ticket prices are carrying Delta even as jet fuel "
        "jumps with oil — the brand is the ballast"
    ),
    "CHWY": (
        "Repeat Autoship orders and higher-margin own brands are lifting earnings "
        "as pet spending stays resilient"
    ),
    "RELY": (
        "More cross-border money transfers and a slightly higher fee per transfer "
        "are compounding; the corridor network is the moat"
    ),
    "INCY": (
        "Jakafi drug cash funds the pipeline while cancer-drug optionality keeps "
        "the biotech upside intact"
    ),
    "IBM": (
        "Software mix and consulting tied to hybrid cloud are lifting margins — "
        "the upgrade story is recurring software, not old hardware"
    ),
}


def safe_float(x):
    try:
        if x is None:
            return None
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except (TypeError, ValueError):
        return None


def series_trend(vals):
    """Return (label, first, last) for a numeric series oldest→newest."""
    nums = [safe_float(v) for v in (vals or [])]
    nums = [v for v in nums if v is not None]
    if len(nums) < 2:
        return None
    first, last = nums[0], nums[-1]
    if first == 0:
        return None
    change = (last - first) / abs(first)
    if last > first * 1.15:
        return ("rising", first, last, change)
    if last < first * 0.85:
        return ("falling", first, last, change)
    return ("steady", first, last, change)


def fmt_money_b(x):
    v = safe_float(x)
    if v is None:
        return None
    if abs(v) >= 1:
        return f"${v:.1f}B"
    return f"${v * 1000:.0f}M"


def load_ranked_fallback():
    path = FV_DIR / "all_upside_ranked.json"
    if not path.exists():
        return {}
    rows = json.loads(path.read_text()).get("stocks") or []
    out = {}
    for r in rows:
        sym = str(r.get("symbol") or "").upper()
        if not sym:
            continue
        out[sym] = {
            "industry": r.get("industry"),
            "price": safe_float(r.get("price")),
            "fv": safe_float(r.get("fv")),
            "upside": safe_float(r.get("upside_pct")),
            "pe": None,
            "fpe": None,
            "pe_med": None,
            "fpe_med": None,
            "beta": None,
            "fcf": None,
            "ni": None,
            "score": None,
            "rank": None,
            "n_ranked": None,
            "in_top_half": False,
            "blend_included": [],
        }
    return out


def load_fv_index():
    """symbol -> rich context including peer PE stats and growth rank."""
    index = {}
    ranked_fb = load_ranked_fallback()
    for path in glob.glob(str(FV_DIR / "*_industry_fair_values.json")):
        try:
            data = json.loads(Path(path).read_text())
        except Exception:
            continue
        for block in data:
            meta = block.get("meta") or {}
            industry = meta.get("group_name") or Path(path).stem.replace(
                "_industry_fair_values", ""
            ).replace("_", " ")
            scores = meta.get("total_scores") or {}
            top_half = set(meta.get("top_half") or [])
            vals = block.get("valuations") or []

            pe_list = []
            fpe_list = []
            for v in vals:
                m = v.get("meta") or {}
                pe = safe_float(m.get("pe_ratio_ttm"))
                fpe = safe_float(m.get("forward_pe"))
                if pe and pe > 0:
                    pe_list.append(pe)
                if fpe and fpe > 0:
                    fpe_list.append(fpe)
            pe_med = statistics.median(pe_list) if pe_list else None
            fpe_med = statistics.median(fpe_list) if fpe_list else None

            # Rank by total_scores (lower = better growth composite)
            ranked = sorted(
                ((sym, sc) for sym, sc in scores.items() if isinstance(sc, (int, float))),
                key=lambda x: x[1],
            )
            rank_map = {sym: i + 1 for i, (sym, _) in enumerate(ranked)}
            n_ranked = len(ranked)

            for v in vals:
                sym = str(v.get("symbol") or "").upper()
                if not sym:
                    continue
                m = v.get("meta") or {}
                detail = v.get("blended_detail") or {}
                price = safe_float(detail.get("stock_price")) or safe_float(
                    m.get("price")
                )
                fv = safe_float(v.get("blended_fair_value")) or safe_float(
                    detail.get("fair_value")
                )
                upside = None
                if price and fv and price > 0:
                    upside = (fv / price - 1) * 100
                pe = safe_float(m.get("pe_ratio_ttm"))
                fpe = safe_float(m.get("forward_pe"))
                beta = safe_float(m.get("beta"))
                fcf = m.get("fcf_fcfs_raw_oldest_to_newest_billions")
                ni = m.get("net_income_adjusted_oldest_to_newest") or m.get(
                    "net_income_gaap_oldest_to_newest"
                )
                index[sym] = {
                    "industry": industry,
                    "price": price,
                    "fv": fv,
                    "upside": upside,
                    "pe": pe,
                    "fpe": fpe,
                    "pe_med": pe_med,
                    "fpe_med": fpe_med,
                    "beta": beta,
                    "fcf": fcf,
                    "ni": ni,
                    "score": scores.get(sym),
                    "rank": rank_map.get(sym),
                    "n_ranked": n_ranked,
                    "in_top_half": sym in top_half,
                    "blend_included": detail.get("blend_included") or [],
                }
    # Fill gaps from ranked index (e.g. names missing a peer-file row).
    for sym, row in ranked_fb.items():
        if sym not in index:
            index[sym] = row
    return index


def load_news_by_ticker():
    news_path = SNIPER / "data" / "news.json"
    by = {}
    try:
        items = json.loads(news_path.read_text())
    except Exception:
        return by
    for item in items:
        line = (item.get("line") or "").strip()
        details = (item.get("details") or "").strip()
        # Prefer the punchy line; fold a short clause from details if useful
        hook = line
        if details and len(details) < 160 and details.lower() not in line.lower():
            # keep line primary; details used only if line is thin
            pass
        for t in item.get("tickers") or []:
            by.setdefault(t.upper(), []).append(
                {"line": line, "details": details, "sentiment": item.get("sentiment")}
            )
    return by


def peer_multiple_clause(ctx):
    pe, pe_med = ctx.get("pe"), ctx.get("pe_med")
    fpe, fpe_med = ctx.get("fpe"), ctx.get("fpe_med")
    # Skip absurd trailing multiples (one-off earnings distortions).
    if pe and pe_med and pe_med > 0 and 3 <= pe <= 80 and 3 <= pe_med <= 80:
        gap = (pe / pe_med - 1) * 100
        if gap <= -12:
            return (
                f"it screens cheap at {pe:.0f}× trailing earnings versus a "
                f"{pe_med:.0f}× industry median"
            )
        if gap >= 20:
            return (
                f"the market already pays a premium at {pe:.0f}× trailing vs "
                f"{pe_med:.0f}× peers — so the case rests on growth, not multiple expansion"
            )
        return (
            f"at {pe:.0f}× trailing earnings near the {pe_med:.0f}× industry median, "
            f"the edge is fundamentals, not a deep multiple discount"
        )
    if fpe and fpe_med and fpe_med > 0 and 3 <= fpe <= 80 and 3 <= fpe_med <= 80:
        gap = (fpe / fpe_med - 1) * 100
        if gap <= -12:
            return (
                f"forward earnings trade at {fpe:.0f}× vs a {fpe_med:.0f}× "
                f"industry median — a real discount if estimates hold"
            )
        return (
            f"forward multiple sits near {fpe:.0f}× against a {fpe_med:.0f}× "
            f"peer median"
        )
    return None


def growth_rank_clause(ctx):
    rank, n = ctx.get("rank"), ctx.get("n_ranked")
    if not rank or not n or n < 3:
        return None
    industry = ctx.get("industry") or "its industry"
    if rank <= max(2, n // 5):
        return (
            f"composite growth scores rank it #{rank} of {n} in {industry} — "
            f"top-tier vs the peer set used in the model"
        )
    if ctx.get("in_top_half"):
        return (
            f"it clears the model's top-half growth screen in {industry} "
            f"(#{rank} of {n})"
        )
    if rank >= n * 0.7:
        return (
            f"growth scores sit back-half in {industry} (#{rank}/{n}), so the "
            f"setup leans on cash generation and valuation, not acceleration"
        )
    return f"growth composite ranks #{rank} of {n} names in {industry}"


def key_fundamentals(ctx: dict | None) -> list[str]:
    """Up to 3 punchy fundamentals: big growth, peer gap, ranking, model gap."""
    if not ctx:
        return []
    scored: list[tuple[float, str]] = []

    fcf_t = series_trend(ctx.get("fcf"))
    if fcf_t:
        label, first, last, change = fcf_t
        a, b = fmt_money_b(first), fmt_money_b(last)
        if label == "rising" and change >= 0.35 and a and b:
            scored.append(
                (90 + min(change, 5), f"cash flow jumped {a} → {b}")
            )
        elif label == "rising" and change >= 0.15 and a and b:
            scored.append((70, f"cash flow up {a} → {b}"))
        elif label == "falling" and change <= -0.25 and a and b:
            scored.append((55, f"cash flow slipped {a} → {b}"))

    ni_t = series_trend(ctx.get("ni"))
    if ni_t:
        label, first, last, change = ni_t
        if label == "rising" and change >= 0.4:
            scored.append(
                (85 + min(abs(change), 4), f"profits up about {change * 100:.0f}%")
            )
        elif label == "falling" and change <= -0.3:
            scored.append((50, f"profits down about {abs(change) * 100:.0f}%"))

    pe, pe_med = ctx.get("pe"), ctx.get("pe_med")
    if pe and pe_med and 3 <= pe <= 80 and 3 <= pe_med <= 80:
        gap = (pe / pe_med - 1) * 100
        if gap <= -15:
            scored.append(
                (
                    80 + min(abs(gap) / 2, 20),
                    f"cheaper than peers at {pe:.0f}× earnings vs {pe_med:.0f}× median",
                )
            )
        elif gap >= 25:
            scored.append(
                (
                    45,
                    f"trades rich at {pe:.0f}× earnings vs {pe_med:.0f}× peers",
                )
            )

    rank, n = ctx.get("rank"), ctx.get("n_ranked")
    if rank and n and n >= 4:
        industry = ctx.get("industry") or "its industry"
        if rank <= max(2, n // 5):
            scored.append(
                (88, f"#{rank} growth rank of {n} in {industry}")
            )
        elif rank <= n // 2 and ctx.get("in_top_half"):
            scored.append(
                (60, f"top-half growth (#{rank}/{n}) in {industry}")
            )

    up = ctx.get("upside")
    if up is not None:
        if up >= 40:
            scored.append((75 + min(up / 5, 20), f"~{up:.0f}% below our fair value"))
        elif up >= 15:
            scored.append((58, f"~{up:.0f}% below our fair value"))
        elif up <= -15:
            scored.append((40, f"already ~{abs(up):.0f}% above our fair value"))

    scored.sort(key=lambda x: -x[0])
    # Dedupe similar themes, keep max 3
    out: list[str] = []
    used = set()
    for _, text in scored:
        key = text.split()[0]
        if key in used and key in ("cash", "profits"):
            continue
        theme = (
            "cash"
            if "cash" in text
            else "profits"
            if "profits" in text
            else "pe"
            if "earnings" in text or "peers" in text or "rich" in text
            else "rank"
            if "rank" in text or "top-half" in text
            else "fv"
            if "fair value" in text
            else text
        )
        if theme in used:
            continue
        used.add(theme)
        out.append(text)
        if len(out) >= 3:
            break
    return out


def news_hook(ticker, news_map):
    items = news_map.get(ticker) or []
    if not items:
        return None
    line = items[0]["line"].rstrip(".")
    generic = (
        "wall street",
        "markets await",
        "federal reserve",
        "four of the biggest",
        "big tech lost",
    )
    low = line.lower()
    if any(g in low for g in generic) and len(items) == 1:
        return line
    return line


def build_thesis(
    ticker: str, ctx: dict | None, news_map: dict, headline: str
) -> dict:
    """Single always-visible thesis: story + up to 3 key fundamentals."""
    custom = CUSTOM_HOOKS.get(ticker)
    news = news_hook(ticker, news_map)
    keys = key_fundamentals(ctx)

    if custom:
        lead = custom.rstrip(".")
    elif news and not any(
        g in news.lower()
        for g in (
            "wall street fell",
            "markets await",
            "four of the biggest",
            "big tech lost",
        )
    ):
        lead = news.rstrip(".")
    elif keys:
        # Lead with the strongest fundamental when we have no story hook.
        lead = keys[0][0].upper() + keys[0][1:]
        keys = keys[1:]
    else:
        name = headline.split(".")[0] if headline else ticker
        lead = name.rstrip(".")

    if keys:
        if len(keys) == 1:
            entry = f"{lead} — {keys[0]}."
        elif len(keys) == 2:
            entry = f"{lead} — {keys[0]}; {keys[1]}."
        else:
            entry = f"{lead} — {keys[0]}; {keys[1]}; {keys[2]}."
    else:
        entry = lead + "."

    return {"entry": entry, "numbers": ""}

def main():
    print("Loading FvIndustries index…")
    fv = load_fv_index()
    print(f"  {len(fv)} symbols with valuations")
    news_map = load_news_by_ticker()

    blurbs_paths = [
        SNIPER / "data" / "company_blurbs.json",
        SNIPER / "data" / ".runtime" / "company_blurbs.json",
    ]
    blurbs = json.loads(blurbs_paths[0].read_text())

    # Also ensure every catalog stock has a blurb entry
    stocks_paths = [
        SNIPER / "data" / "stocks.json",
        SNIPER / "data" / ".runtime" / "stocks.json",
    ]
    stocks = json.loads(stocks_paths[0].read_text())
    for s in stocks:
        t = s["ticker"].upper()
        if t not in blurbs:
            blurbs[t] = {
                "headline": s.get("business")
                or s.get("reasoning")
                or f"{s.get('name', t)} operates in {s.get('sector', 'its sector')}.",
                "entry": "",
            }

    # Ranked universe extras that appear in famous/search — give them blurbs too
    ranked_path = FV_DIR / "all_upside_ranked.json"
    if ranked_path.exists():
        ranked = json.loads(ranked_path.read_text()).get("stocks") or []
        # Only add positive-upside names missing blurbs if we want full system;
        # user asked every stock in the system — cover all blurbs + catalog +
        # any holding snapshots. Keep blurbs set as the working set, then add
        # catalog. Optionally extend to all ranked would be 805 — do all ranked
        # that have FV context for completeness when searched via add-stock.
        for row in ranked:
            t = str(row.get("symbol") or "").upper()
            if not t or t in blurbs:
                continue
            # lightweight headline from industry
            ind = row.get("industry") or "its industry"
            blurbs[t] = {
                "headline": f"{t} operates in {ind}.",
                "entry": "",
            }

    rewritten = 0
    for ticker, blurb in list(blurbs.items()):
        headline = (blurb.get("headline") or "").strip()
        ctx = fv.get(ticker)
        thesis = build_thesis(ticker, ctx, news_map, headline)
        blurb["entry"] = thesis["entry"]
        blurb.pop("numbers", None)
        rewritten += 1

    text = json.dumps(blurbs, indent=2) + "\n"
    for p in blurbs_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
    if NOAM_BLURBS.parent.exists():
        # Keep StockAnalysis in sync for builder path
        # Preserve NoamShit-only keys? We write full map.
        NOAM_BLURBS.write_text(text)

    # Sync stocks.json reasoning (+ business from headline)
    for path in stocks_paths:
        if not path.exists():
            continue
        rows = json.loads(path.read_text())
        for s in rows:
            t = s["ticker"].upper()
            b = blurbs.get(t)
            if not b:
                continue
            if b.get("headline"):
                s["business"] = b["headline"]
            if b.get("entry"):
                s["reasoning"] = b["entry"]
            s.pop("numbers", None)
            # keep upside in thesis-aligned if FV available
            ctx = fv.get(t)
            if ctx and ctx.get("upside") is not None:
                s["upsidePct"] = round(ctx["upside"], 1)
                if ctx.get("fv"):
                    s["fairValue"] = round(ctx["fv"], 2)
        path.write_text(json.dumps(rows, indent=2) + "\n")

    # Ideas
    for ideas_path in [
        SNIPER / "data" / "ideas.json",
        SNIPER / "data" / ".runtime" / "ideas.json",
    ]:
        if not ideas_path.exists():
            continue
        ideas = json.loads(ideas_path.read_text())
        changed = False
        for idea in ideas:
            t = str(idea.get("ticker") or "").upper()
            b = blurbs.get(t)
            if not b:
                continue
            if b.get("headline"):
                idea["business"] = b["headline"]
            if b.get("entry"):
                idea["entry"] = b["entry"]
                idea["thesis"] = b["entry"]
                changed = True
            if "numbers" in idea:
                del idea["numbers"]
                changed = True
        if changed:
            ideas_path.write_text(json.dumps(ideas, indent=2) + "\n")

    # House snipers reasoning
    for sn_path in [
        SNIPER / "data" / "snipers.json",
        SNIPER / "data" / ".runtime" / "snipers.json",
    ]:
        if not sn_path.exists():
            continue
        house = json.loads(sn_path.read_text())
        for h in house.get("holdings") or []:
            t = str(h.get("ticker") or "").upper()
            b = blurbs.get(t)
            if not b:
                continue
            if b.get("headline"):
                h["business"] = b["headline"]
            if b.get("entry"):
                h["reasoning"] = b["entry"]
            h.pop("numbers", None)
        sn_path.write_text(json.dumps(house, indent=2) + "\n")

    # Sanity: no banned boilerplate left
    banned_hits = []
    for t, b in blurbs.items():
        e = b.get("entry") or ""
        if "normalized earnings" in e.lower() or "sector tailwinds" in e.lower():
            banned_hits.append(t)

    print(f"Rewrote {rewritten} blurbs")
    print(f"DIS entry: {blurbs['DIS']['entry']}")
    print(f"META entry: {blurbs.get('META',{}).get('entry')}")
    print(f"Banned leftovers: {banned_hits[:10]} (n={len(banned_hits)})")
    for sample in ["NFLX", "LIN", "IDCC", "BA", "CAT"]:
        print(f"\n{sample}: {blurbs.get(sample,{}).get('entry','MISSING')}")


if __name__ == "__main__":
    main()
