#!/usr/bin/env python3
"""Pull latest FvIndustries blended fair values into SNIPER catalog JSON.

Updates data/stocks.json (+ runtime), ideas.json, and house snipers TP levels.
Prints a change report.
"""

from __future__ import annotations

import glob
import json
import math
from pathlib import Path

SNIPER = Path("/Users/noambelinkis/Documents/SNIPER")
FV_DIR = Path("/Users/noambelinkis/Documents/StockAnalysis/FvIndustries-0-0-")


def safe_float(v):
    try:
        if v is None:
            return None
        x = float(v)
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    except (TypeError, ValueError):
        return None


def load_fv_index() -> dict[str, dict]:
    """Prefer fresh *_industry_fair_values.json; fill gaps from all_upside_ranked."""
    index: dict[str, dict] = {}

    for path in sorted(glob.glob(str(FV_DIR / "*_industry_fair_values.json"))):
        try:
            data = json.loads(Path(path).read_text())
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for block in data:
            if not isinstance(block, dict):
                continue
            industry = (block.get("meta") or {}).get("group_name") or ""
            for v in block.get("valuations") or []:
                sym = str(v.get("symbol") or "").upper().strip()
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
                beta = safe_float(m.get("beta"))
                upside = None
                if price and fv and price > 0:
                    upside = (fv / price - 1.0) * 100.0
                if fv is None and price is None:
                    continue
                index[sym] = {
                    "price": price,
                    "fv": fv,
                    "upside": upside,
                    "beta": beta,
                    "industry": industry or None,
                }

    ranked_path = FV_DIR / "all_upside_ranked.json"
    if ranked_path.exists():
        try:
            ranked = json.loads(ranked_path.read_text())
            for r in ranked.get("stocks") or []:
                sym = str(r.get("symbol") or "").upper().strip()
                if not sym or sym in index:
                    continue
                price = safe_float(r.get("price"))
                fv = safe_float(r.get("fv"))
                upside = safe_float(r.get("upside_pct"))
                if upside is None and price and fv and price > 0:
                    upside = (fv / price - 1.0) * 100.0
                index[sym] = {
                    "price": price,
                    "fv": fv,
                    "upside": upside,
                    "beta": None,
                    "industry": r.get("industry"),
                }
        except Exception:
            pass

    return index


def nearly(a, b, tol=0.02):
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= max(tol, abs(float(b)) * 0.002)


def update_stock(row: dict, fv: dict) -> list[str]:
    changes: list[str] = []
    old = {
        "price": row.get("price"),
        "fairValue": row.get("fairValue"),
        "upsidePct": row.get("upsidePct"),
        "beta": row.get("beta"),
        "tp": (row.get("levels") or {}).get("tp"),
        "ep": (row.get("levels") or {}).get("ep"),
        "sl": (row.get("levels") or {}).get("sl"),
    }

    price = fv.get("price")
    fair = fv.get("fv")
    upside = fv.get("upside")
    beta = fv.get("beta")

    if price is not None and not nearly(old["price"], price):
        row["price"] = round(price, 2)
        changes.append(f"price {old['price']}→{row['price']}")
    if fair is not None and not nearly(old["fairValue"], fair):
        row["fairValue"] = round(fair, 2)
        changes.append(f"FV {old['fairValue']}→{row['fairValue']}")
    if upside is not None and not nearly(old["upsidePct"], upside, tol=0.15):
        row["upsidePct"] = round(upside, 1)
        changes.append(f"upside {old['upsidePct']}→{row['upsidePct']}%")
    if beta is not None and not nearly(old["beta"], beta, tol=0.01):
        row["beta"] = round(beta, 2)
        changes.append(f"beta {old['beta']}→{row['beta']}")

    levels = dict(row.get("levels") or {})
    # Target always tracks fair value.
    if fair is not None and not nearly(old["tp"], fair):
        levels["tp"] = round(fair, 2)
        changes.append(f"TP {old['tp']}→{levels['tp']}")

    # If EP/SL looked auto-derived from old price, refresh with new price.
    new_price = row.get("price")
    if (
        price is not None
        and old["price"] is not None
        and nearly(old["ep"], old["price"])
        and not nearly(old["ep"], new_price)
    ):
        levels["ep"] = round(float(new_price), 2)
        changes.append(f"EP {old['ep']}→{levels['ep']}")
    if (
        price is not None
        and old["price"] is not None
        and nearly(old["sl"], float(old["price"]) * 0.9)
        and new_price
    ):
        new_sl = round(float(new_price) * 0.9, 2)
        if not nearly(old["sl"], new_sl):
            levels["sl"] = new_sl
            changes.append(f"SL {old['sl']}→{levels['sl']}")

    if levels:
        row["levels"] = levels

    if fv.get("industry") and not row.get("industry"):
        row["industry"] = fv["industry"]
        changes.append(f"industry +{fv['industry']}")

    return changes


def main():
    fv_index = load_fv_index()
    print(f"FvIndustries symbols loaded: {len(fv_index)}")

    stock_paths = [
        SNIPER / "data" / "stocks.json",
        SNIPER / "data" / ".runtime" / "stocks.json",
    ]
    stocks = json.loads(stock_paths[0].read_text())
    report: list[tuple[str, list[str]]] = []
    missing: list[str] = []

    # Common catalog ↔ FvIndustries ticker aliases
    aliases = {"GOOGL": "GOOG", "BRK.B": "BRK-B", "BRK.A": "BRK-A"}

    for s in stocks:
        ticker = str(s.get("ticker") or "").upper()
        fv = fv_index.get(ticker) or fv_index.get(aliases.get(ticker, ""))
        if not fv:
            missing.append(ticker)
            continue
        ch = update_stock(s, fv)
        if ch:
            report.append((ticker, ch))

    payload = json.dumps(stocks, indent=2) + "\n"
    for path in stock_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload)

    # Ideas: upside + TP
    ideas_path = SNIPER / "data" / "ideas.json"
    ideas_runtime = SNIPER / "data" / ".runtime" / "ideas.json"
    ideas_changes: list[tuple[str, list[str]]] = []
    if ideas_path.exists():
        ideas = json.loads(ideas_path.read_text())
        for idea in ideas:
            ticker = str(idea.get("ticker") or "").upper()
            fv = fv_index.get(ticker)
            if not fv:
                continue
            ch = []
            if fv.get("upside") is not None and not nearly(
                idea.get("upsidePct"), fv["upside"], tol=0.15
            ):
                old = idea.get("upsidePct")
                idea["upsidePct"] = round(fv["upside"], 1)
                ch.append(f"upside {old}→{idea['upsidePct']}%")
            levels = dict(idea.get("levels") or {})
            if fv.get("fv") is not None and not nearly(levels.get("tp"), fv["fv"]):
                old_tp = levels.get("tp")
                levels["tp"] = round(fv["fv"], 2)
                idea["levels"] = levels
                ch.append(f"TP {old_tp}→{levels['tp']}")
            if ch:
                ideas_changes.append((ticker, ch))
        ip = json.dumps(ideas, indent=2) + "\n"
        ideas_path.write_text(ip)
        ideas_runtime.parent.mkdir(parents=True, exist_ok=True)
        ideas_runtime.write_text(ip)

    # House book: update TP to FV only (keep filled EP)
    snipers_path = SNIPER / "data" / "snipers.json"
    snipers_runtime = SNIPER / "data" / ".runtime" / "snipers.json"
    house_changes: list[tuple[str, list[str]]] = []
    if snipers_path.exists():
        house = json.loads(snipers_path.read_text())
        for h in house.get("holdings") or []:
            ticker = str(h.get("ticker") or "").upper()
            fv = fv_index.get(ticker)
            if not fv or fv.get("fv") is None:
                continue
            levels = dict(h.get("levels") or {})
            old_tp = levels.get("tp")
            if not nearly(old_tp, fv["fv"]):
                levels["tp"] = round(fv["fv"], 2)
                h["levels"] = levels
                house_changes.append((ticker, [f"TP {old_tp}→{levels['tp']}"]))
        hp = json.dumps(house, indent=2) + "\n"
        snipers_path.write_text(hp)
        snipers_runtime.parent.mkdir(parents=True, exist_ok=True)
        snipers_runtime.write_text(hp)

    print(f"\nCatalog stocks updated: {len(report)} / {len(stocks)}")
    if missing:
        print(f"Missing in FvIndustries: {', '.join(missing)}")
    print("\n=== STOCKS ===")
    for ticker, ch in sorted(report):
        print(f"  {ticker}: " + "; ".join(ch))
    if not report:
        print("  (no numeric changes)")

    print(f"\n=== IDEAS ({len(ideas_changes)}) ===")
    for ticker, ch in ideas_changes:
        print(f"  {ticker}: " + "; ".join(ch))
    if not ideas_changes:
        print("  (no changes)")

    print(f"\n=== HOUSE SNIPERS TP ({len(house_changes)}) ===")
    for ticker, ch in house_changes:
        print(f"  {ticker}: " + "; ".join(ch))
    if not house_changes:
        print("  (no changes)")

    # Compact summary CSV-ish for the user
    print("\n=== SUMMARY TABLE ===")
    print(f"{'Ticker':<8} {'Price':>10} {'FV':>10} {'Upside%':>9}  Changes")
    by_t = {t: c for t, c in report}
    for s in sorted(stocks, key=lambda x: x.get("ticker") or ""):
        t = s["ticker"]
        if t not in by_t:
            continue
        print(
            f"{t:<8} {s.get('price'):>10} {s.get('fairValue'):>10} {s.get('upsidePct'):>8}%  {'; '.join(by_t[t])}"
        )


if __name__ == "__main__":
    main()
