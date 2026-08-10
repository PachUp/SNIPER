#!/usr/bin/env python3
"""Pull Sortino (and optionally Sharpe) from FvIndustries risk JSON into SNIPER catalog.

Default: write/update ``sortino`` only (leaves existing ``sharpe`` alone).
Pass ``--update-sharpe`` to refresh Sharpe from the same file.

Updates data/stocks.json and data/.runtime/stocks.json.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

SNIPER = Path(__file__).resolve().parents[1]
FV_FILE = Path(
    "/Users/noambelinkis/Documents/StockAnalysis/FvIndustries-0-0-/all_stocks_sharpe_ratios.json"
)


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


def nearly(a, b, tol=0.01):
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= max(tol, abs(float(b)) * 0.002)


def load_risk_map() -> dict[str, dict]:
    if not FV_FILE.exists():
        raise SystemExit(f"Missing {FV_FILE}")
    data = json.loads(FV_FILE.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for row in data.get("stocks") or []:
        if not isinstance(row, dict):
            continue
        sym = str(row.get("symbol") or "").upper().strip()
        if not sym or row.get("error"):
            continue
        sharpe = safe_float(row.get("sharpe_ratio"))
        sortino = safe_float(row.get("sortino_ratio"))
        if sharpe is None and sortino is None:
            continue
        out[sym] = {"sharpe": sharpe, "sortino": sortino}
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Sync Sortino (+ optional Sharpe) into catalog")
    ap.add_argument(
        "--update-sharpe",
        action="store_true",
        help="Also overwrite catalog sharpe from FvIndustries risk file",
    )
    args = ap.parse_args()

    risk = load_risk_map()
    aliases = {"GOOGL": "GOOG", "BRK.B": "BRK-B", "BRK.A": "BRK-A"}

    stock_paths = [
        SNIPER / "data" / "stocks.json",
        SNIPER / "data" / ".runtime" / "stocks.json",
    ]
    stocks = json.loads(stock_paths[0].read_text(encoding="utf-8"))
    report: list[tuple[str, list[str]]] = []
    missing: list[str] = []

    for s in stocks:
        ticker = str(s.get("ticker") or "").upper()
        row = risk.get(ticker) or risk.get(aliases.get(ticker, ""))
        if not row:
            missing.append(ticker)
            continue
        changes: list[str] = []
        if (
            args.update_sharpe
            and row.get("sharpe") is not None
            and not nearly(s.get("sharpe"), row["sharpe"])
        ):
            old = s.get("sharpe")
            s["sharpe"] = round(row["sharpe"], 3)
            changes.append(f"sharpe {old}→{s['sharpe']}")
        if row.get("sortino") is not None and not nearly(s.get("sortino"), row["sortino"]):
            old = s.get("sortino")
            s["sortino"] = round(row["sortino"], 3)
            changes.append(f"sortino {old}→{s['sortino']}")
        if changes:
            report.append((ticker, changes))

    payload = json.dumps(stocks, indent=2) + "\n"
    for path in stock_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload, encoding="utf-8")

    mode = "sortino" + ("+sharpe" if args.update_sharpe else "")
    print(f"Updated {len(report)} stocks ({mode}) · missing risk rows: {len(missing)}")
    for t, ch in report[:40]:
        print(f"  {t}: {', '.join(ch)}")
    if len(report) > 40:
        print(f"  … +{len(report) - 40} more")
    if missing:
        print("No risk metrics for:", ", ".join(missing[:30]))


if __name__ == "__main__":
    main()
