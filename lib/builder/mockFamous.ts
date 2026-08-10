import type { Stock } from "@/lib/types";
import type { FamousListResult } from "@/lib/builder/map";

/** Always pickable even when model upside is under the 20% famous bar. */
export const FAMOUS_UPSIDE_EXCEPTIONS = new Set(["IBM", "YUM"]);

const FAMOUS_MIN_UPSIDE_PCT = 20;

function isFamousEligible(symbol: string, upsidePct: number): boolean {
  if (FAMOUS_UPSIDE_EXCEPTIONS.has(symbol.toUpperCase())) return true;
  return upsidePct >= FAMOUS_MIN_UPSIDE_PCT;
}

/** Build famous-pick list from admin symbols + catalog metrics. */
export function FAMOUS_MOCK(
  stocks: Stock[],
  famousSymbols: string[]
): FamousListResult {
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  const picks = famousSymbols.map((symbol) => {
    const s = byTicker.get(symbol);
    if (!s) {
      return { symbol, eligible: false, reason: "not_in_mock" as const };
    }
    const eligible = isFamousEligible(symbol, s.upsidePct);
    return {
      symbol,
      eligible,
      name: s.name,
      reasoning: s.reasoning,
      business: s.business,
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
    famous_min_upside_pct: FAMOUS_MIN_UPSIDE_PCT,
    eligible: picks.filter((p) => p.eligible).map((p) => p.symbol),
    picks,
    built_at: new Date().toISOString(),
  };
}
