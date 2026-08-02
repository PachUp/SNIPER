#!/usr/bin/env python3
"""Look up one symbol in FvIndustries blended fair-value files → JSON stdout."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


GICS_SECTORS = {
    "Energy",
    "Materials",
    "Industrials",
    "Consumer Discretionary",
    "Consumer Staples",
    "Health Care",
    "Financials",
    "Information Technology",
    "Communication Services",
    "Utilities",
    "Real Estate",
}

# Non-GICS labels used in NoamShit universe → GICS.
SECTOR_ALIASES = {
    "ai sector": "Information Technology",
    "technology": "Information Technology",
    "info tech": "Information Technology",
    "information tech": "Information Technology",
    "tech": "Information Technology",
    "healthcare": "Health Care",
    "health care": "Health Care",
    "consumer cyclical": "Consumer Discretionary",
    "consumer defensive": "Consumer Staples",
    "financial services": "Financials",
    "communication services": "Communication Services",
    "communications": "Communication Services",
    "basic materials": "Materials",
}


def normalize_sector(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if raw in GICS_SECTORS:
        return raw
    mapped = SECTOR_ALIASES.get(raw.lower())
    if mapped:
        return mapped
    # Case-insensitive GICS match
    for gics in GICS_SECTORS:
        if gics.lower() == raw.lower():
            return gics
    return raw


def _is_blank_industry(value: str) -> bool:
    t = (value or "").strip().lower()
    return not t or t in {"unknown", "n/a", "na", "none", "null"}


def _remember_symbol(
    symbol_meta: dict[str, dict[str, str]],
    sym: str,
    *,
    sector: str = "",
    industry: str = "",
    name: str = "",
) -> None:
    sym = (sym or "").upper().strip()
    if not sym:
        return
    row = symbol_meta.setdefault(sym, {"sector": "", "industry": "", "name": ""})
    if sector and not row["sector"]:
        row["sector"] = str(sector)
    if industry and not _is_blank_industry(str(industry)) and (
        not row["industry"] or _is_blank_industry(row["industry"])
    ):
        row["industry"] = str(industry).strip()
    if name and (not row["name"] or row["name"] == sym):
        row["name"] = str(name).strip()


def load_universe_meta(
    universe_path: Path,
) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    """Parse NoamShit / flat universe files → per-symbol meta + industry→sector."""
    symbol_meta: dict[str, dict[str, str]] = {}
    industry_to_sector: dict[str, str] = {}
    try:
        data = json.loads(universe_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return symbol_meta, industry_to_sector

    def note_industry_sector(industry: str, sector: str) -> None:
        if industry and not _is_blank_industry(industry) and sector:
            industry_to_sector.setdefault(str(industry), str(sector))

    # Flat list shapes
    for row in data.get("symbols") or data.get("stocks") or []:
        if not isinstance(row, dict):
            continue
        sym = str(row.get("symbol") or row.get("ticker") or "").upper()
        sector = str(row.get("sector") or "")
        industry = str(
            row.get("industry")
            or row.get("original_finviz_industry")
            or ""
        )
        name = str(row.get("company_name") or row.get("name") or "")
        _remember_symbol(
            symbol_meta, sym, sector=sector, industry=industry, name=name
        )
        note_industry_sector(industry, sector)

    # Nested: sectors → industry → finviz_industry → [rows]
    sectors_tree = data.get("sectors")
    if isinstance(sectors_tree, dict):
        for sector_name, industries in sectors_tree.items():
            if not isinstance(industries, dict):
                continue
            for industry_name, finviz_map in industries.items():
                note_industry_sector(str(industry_name), str(sector_name))
                if not isinstance(finviz_map, dict):
                    continue
                for finviz_industry, rows in finviz_map.items():
                    note_industry_sector(str(finviz_industry), str(sector_name))
                    if not isinstance(rows, list):
                        continue
                    for row in rows:
                        if not isinstance(row, dict):
                            continue
                        sym = str(row.get("symbol") or row.get("ticker") or "")
                        industry = (
                            row.get("industry")
                            or row.get("original_finviz_industry")
                            or (
                                industry_name
                                if not _is_blank_industry(str(industry_name))
                                else finviz_industry
                            )
                            or ""
                        )
                        # Prefer specific finviz label over bucket when useful
                        finviz = str(
                            row.get("original_finviz_industry") or finviz_industry or ""
                        )
                        if _is_blank_industry(str(industry)) and not _is_blank_industry(
                            finviz
                        ):
                            industry = finviz
                        elif (
                            not _is_blank_industry(finviz)
                            and str(industry).lower() != finviz.lower()
                            and str(finviz).lower() not in {"unknown"}
                        ):
                            # Keep the more specific Finviz industry when present
                            industry = finviz
                        name = str(row.get("company_name") or row.get("name") or "")
                        _remember_symbol(
                            symbol_meta,
                            sym,
                            sector=str(sector_name),
                            industry=str(industry),
                            name=name,
                        )

    if isinstance(data.get("by_symbol"), dict):
        for sym, meta in data["by_symbol"].items():
            if not isinstance(meta, dict):
                continue
            _remember_symbol(
                symbol_meta,
                str(sym),
                sector=str(meta.get("sector") or ""),
                industry=str(meta.get("industry") or ""),
                name=str(meta.get("company_name") or meta.get("name") or ""),
            )
            note_industry_sector(
                str(meta.get("industry") or ""), str(meta.get("sector") or "")
            )

    return symbol_meta, industry_to_sector


def guess_sector(industry: str, mapped: str) -> str:
    normalized = normalize_sector(mapped)
    if normalized in GICS_SECTORS:
        return normalized
    text = (industry or "").lower()
    hints = [
        ("oil", "Energy"),
        ("gas", "Energy"),
        ("energy", "Energy"),
        ("aluminum", "Materials"),
        ("copper", "Materials"),
        ("gold", "Materials"),
        ("steel", "Materials"),
        ("mining", "Materials"),
        ("metal", "Materials"),
        ("chemical", "Materials"),
        ("reit", "Real Estate"),
        ("real estate", "Real Estate"),
        ("bank", "Financials"),
        ("insurance", "Financials"),
        ("credit", "Financials"),
        ("capital markets", "Financials"),
        ("biotech", "Health Care"),
        ("drug", "Health Care"),
        ("medical", "Health Care"),
        ("health", "Health Care"),
        ("ai ", "Information Technology"),
        ("artificial intelligence", "Information Technology"),
        ("software", "Information Technology"),
        ("semiconductor", "Information Technology"),
        ("information technology", "Information Technology"),
        ("telecom", "Communication Services"),
        ("entertainment", "Communication Services"),
        ("internet", "Communication Services"),
        ("media", "Communication Services"),
        ("utility", "Utilities"),
        ("utilities", "Utilities"),
        ("airline", "Industrials"),
        ("aerospace", "Industrials"),
        ("railroad", "Industrials"),
        ("industrial", "Industrials"),
        ("construction", "Industrials"),
        ("engineering", "Industrials"),
        ("restaurant", "Consumer Discretionary"),
        ("retail", "Consumer Discretionary"),
        ("apparel", "Consumer Discretionary"),
        ("auto", "Consumer Discretionary"),
        ("food", "Consumer Staples"),
        ("beverage", "Consumer Staples"),
        ("packaged", "Consumer Staples"),
    ]
    for needle, sector in hints:
        if needle in text:
            return sector
    return "Information Technology"


def lookup(symbol: str, fv_dir: Path, universe: Path) -> dict | None:
    symbol = symbol.upper()
    symbol_meta, industry_to_sector = load_universe_meta(universe)
    known = symbol_meta.get(symbol) or {}
    best: dict | None = None
    best_upside = -1e18

    for fp in sorted(fv_dir.glob("*_industry_fair_values.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, list):
            continue
        for block in data:
            block_industry = (block.get("meta") or {}).get("group_name") or ""
            for v in block.get("valuations") or []:
                if not isinstance(v, dict) or v.get("error"):
                    continue
                if str(v.get("symbol") or "").upper() != symbol:
                    continue
                meta = v.get("meta") or {}
                beta = meta.get("beta")
                if not isinstance(beta, (int, float)) or not math.isfinite(float(beta)):
                    beta = 1.0
                bd = v.get("blended_detail") or {}
                price = bd.get("stock_price", meta.get("price"))
                fv = v.get("blended_fair_value")
                if not (
                    isinstance(price, (int, float))
                    and isinstance(fv, (int, float))
                    and price > 0
                    and math.isfinite(float(fv))
                ):
                    continue
                upside = (float(fv) / float(price) - 1.0) * 100.0

                # Prefer curated universe industry over FV "Unknown" buckets.
                industry = known.get("industry") or ""
                if _is_blank_industry(industry):
                    industry = str(block_industry or meta.get("industry") or "")
                if _is_blank_industry(industry):
                    industry = ""

                mapped = (
                    known.get("sector")
                    or industry_to_sector.get(industry)
                    or industry_to_sector.get(str(block_industry))
                    or ""
                )
                sector = guess_sector(industry or str(block_industry), mapped)
                name = known.get("name") or symbol
                row = {
                    "symbol": symbol,
                    "name": name,
                    "price": round(float(price), 4),
                    "fair_value": round(float(fv), 4),
                    "upside_pct": round(upside, 2),
                    "beta": round(float(beta), 4),
                    "industry": industry or str(block_industry) or "Unknown",
                    "sector": sector,
                }
                if upside > best_upside:
                    best_upside = upside
                    best = row
    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("symbol")
    ap.add_argument("--fv-dir", required=True)
    ap.add_argument("--universe", required=True)
    args = ap.parse_args()
    row = lookup(args.symbol, Path(args.fv_dir), Path(args.universe))
    if not row:
        print(json.dumps({"error": f"Symbol {args.symbol.upper()} not found in FvIndustries"}))
        sys.exit(2)
    print(json.dumps(row))


if __name__ == "__main__":
    main()
