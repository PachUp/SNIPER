import type { Stock } from "@/lib/types";
import type { FamousListResult } from "@/lib/builder/map";

/** Fallback famous list when SNIPER_USE_MOCK_BUILDER=1. */
const MOCK_FAMOUS = [
  "DIS",
  "NFLX",
  "JPM",
  "IBM",
  "UBER",
  "T",
  "CMCSA",
  "MA",
  "V",
  "SPOT",
  "DASH",
  "DAL",
  "LYFT",
  "YUM",
  "ROKU",
  "LULU",
] as const;

export function FAMOUS_MOCK(stocks: Stock[]): FamousListResult {
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  const picks = MOCK_FAMOUS.map((symbol) => {
    const s = byTicker.get(symbol);
    if (!s) {
      return { symbol, eligible: false, reason: "not_in_mock" as const };
    }
    const eligible = s.upsidePct >= 20;
    return {
      symbol,
      eligible,
      beta: s.beta,
      upside_pct: s.upsidePct,
      price: s.price,
      fair_value: s.fairValue,
      industry: s.sector,
      sector: s.sector,
      sharpe_ratio: s.sharpe,
      reason: eligible ? null : "below_min_upside_or_disqualified",
    };
  });
  return {
    min_manual_picks: 1,
    max_manual_picks: 4,
    famous_min_upside_pct: 20,
    eligible: picks.filter((p) => p.eligible).map((p) => p.symbol),
    picks,
    built_at: new Date().toISOString(),
  };
}
