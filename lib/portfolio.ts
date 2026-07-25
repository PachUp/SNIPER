import type { BuiltPortfolio, PortfolioHolding, Stock } from "@/lib/types";

/** Matches Python Builder MAX_MANUAL_PICKS / MIN_MANUAL_PICKS. */
export const MIN_USER_PICKS = 1;
export const MAX_USER_PICKS = 4;
export const MAX_HOLDINGS = 12;
/** Mock-only floor; real Builder uses 35% for fillers / 20% for famous picks. */
export const MIN_UPSIDE_PCT = 15;
const TARGET_BETA = 1.0;

/**
 * Mock fill-to-12 logic. Starts from the user's hand-picked stocks and adds
 * AI-selected names that:
 *   - have a fair-value upside of at least 15% (MIN_UPSIDE_PCT),
 *   - pull the portfolio's average beta toward ~1.0 (beta balancing),
 *   - favor higher Sharpe ratios,
 *   - lightly diversify across GICS sectors.
 *
 * Swap this for a call into your valuation software when ready.
 */
export function buildPortfolio(
  allStocks: Stock[],
  userTickers: string[],
  max = MAX_HOLDINGS
): BuiltPortfolio {
  const byTicker = new Map(allStocks.map((s) => [s.ticker, s]));
  const used = new Set<string>();
  const holdings: PortfolioHolding[] = [];

  for (const raw of userTickers.slice(0, MAX_USER_PICKS)) {
    const ticker = raw.toUpperCase();
    if (byTicker.has(ticker) && !used.has(ticker)) {
      used.add(ticker);
      holdings.push({ ticker, source: "user" });
    }
  }

  let pool = allStocks.filter(
    (s) => !used.has(s.ticker) && s.upsidePct >= MIN_UPSIDE_PCT
  );

  const sectorCount = (sector: string) =>
    holdings.filter((h) => byTicker.get(h.ticker)?.sector === sector).length;

  while (holdings.length < max && pool.length > 0) {
    const n = holdings.length;
    const currentBetaSum = holdings.reduce(
      (acc, h) => acc + (byTicker.get(h.ticker)?.beta ?? TARGET_BETA),
      0
    );

    let best: Stock | null = null;
    let bestScore = Infinity;

    for (const cand of pool) {
      const newAvgBeta = (currentBetaSum + cand.beta) / (n + 1);
      const betaPenalty = Math.abs(newAvgBeta - TARGET_BETA);
      const sharpeBonus = cand.sharpe * 0.15;
      const upsideBonus = (cand.upsidePct / 100) * 0.1;
      const sectorPenalty = sectorCount(cand.sector) * 0.05;

      const score = betaPenalty - sharpeBonus - upsideBonus + sectorPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    if (!best) break;
    used.add(best.ticker);
    holdings.push({ ticker: best.ticker, source: "ai" });
    pool = pool.filter((s) => s.ticker !== best!.ticker);
  }

  return {
    createdAt: new Date().toISOString(),
    holdings,
  };
}
