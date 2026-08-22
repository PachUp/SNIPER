"""Industry → Broad / Growth / Both affinity (Finviz / StockAnalysis labels).

Reads ``data/industry_build_styles.json`` so TS and Python stay aligned.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

BuildStyle = Literal["broad", "growth"]
StyleAffinity = Literal["broad", "growth", "both", "unknown"]

_REPO_ROOT = Path(__file__).resolve().parent.parent
_TAXONOMY_PATH = _REPO_ROOT / "data" / "industry_build_styles.json"


@lru_cache(maxsize=1)
def _taxonomy() -> dict:
    raw = json.loads(_TAXONOMY_PATH.read_text(encoding="utf-8"))
    return {
        "growth": {str(x).strip().lower() for x in raw.get("growth", [])},
        "broad": {str(x).strip().lower() for x in raw.get("broad", [])},
        "both": {str(x).strip().lower() for x in raw.get("both", [])},
        "growthKeywords": [str(x).lower() for x in raw.get("growthKeywords", [])],
        "broadKeywords": [str(x).lower() for x in raw.get("broadKeywords", [])],
        "bothKeywords": [str(x).lower() for x in raw.get("bothKeywords", [])],
    }


def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _keyword_hit(industry: str, keys: list[str]) -> bool:
    return any(k in industry for k in keys)


def industry_style_affinity(
    industry: Optional[str] = None,
    sector: Optional[str] = None,
) -> StyleAffinity:
    tax = _taxonomy()
    ind = _norm(industry)
    if ind:
        if ind in tax["both"]:
            return "both"
        if ind in tax["growth"]:
            return "growth"
        if ind in tax["broad"]:
            return "broad"
        if _keyword_hit(ind, tax["bothKeywords"]):
            return "both"
        if _keyword_hit(ind, tax["growthKeywords"]):
            return "growth"
        if _keyword_hit(ind, tax["broadKeywords"]):
            return "broad"

    sec = _norm(sector)
    if any(x in sec for x in ("information technology", "communication")) or sec == "consumer discretionary":
        return "growth"
    if any(
        x in sec
        for x in (
            "utilit",
            "energy",
            "real estate",
            "financial",
            "consumer staples",
            "material",
            "industrial",
        )
    ):
        return "broad"
    if "health" in sec:
        return "both"
    return "unknown"


def matches_build_style(
    style: BuildStyle,
    industry: Optional[str] = None,
    sector: Optional[str] = None,
) -> bool:
    aff = industry_style_affinity(industry, sector)
    if aff in ("both", "unknown"):
        return True
    return aff == style


def style_fit_bonus(
    style: BuildStyle,
    industry: Optional[str] = None,
    sector: Optional[str] = None,
) -> float:
    aff = industry_style_affinity(industry, sector)
    if aff == "both":
        return 0.18
    if aff == style:
        return 0.28
    if aff == "unknown":
        return 0.05
    return -0.22


def parse_build_style(raw: Optional[str]) -> Optional[BuildStyle]:
    if not raw:
        return None
    s = str(raw).strip().lower()
    if s in ("broad", "growth"):
        return s  # type: ignore[return-value]
    return None
