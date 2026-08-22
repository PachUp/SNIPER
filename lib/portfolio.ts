import type { BuiltPortfolio, PortfolioHolding, Stock } from "@/lib/types";
import {
  matchesBuildStyle,
  styleFitBonus,
  type BuildStyle,
} from "@/lib/buildStyle";

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
 *   - diversify across GICS sectors,
 *   - when ``style`` is set, prefer Finviz industries matching Broad vs Growth
 *     (``both`` industries allowed in either book).
 */
export function buildPortfolio(
  allStocks: Stock[],
  userTickers: string[],
  max = MAX_HOLDINGS,
  style: BuildStyle | null = null
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

  const upsidePool = allStocks.filter(
    (s) => !used.has(s.ticker) && s.upsidePct >= MIN_UPSIDE_PCT
  );

  let pool = style
    ? upsidePool.filter((s) =>
        matchesBuildStyle(style, s.industry, s.sector)
      )
    : upsidePool;
  // Never fail a build for style — relax if the affinity pool is thin.
  if (style && pool.length < max - holdings.length) {
    pool = upsidePool;
  }

  const sectorCount = (sector: string) =>
    holdings.filter((h) => byTicker.get(h.ticker)?.sector === sector).length;

  const industryCount = (industry: string) =>
    holdings.filter(
      (h) => (byTicker.get(h.ticker)?.industry || "") === industry
    ).length;

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
      // Growth tilts harder on upside; Broad leans on diversification.
      const upsideWeight = style === "growth" ? 0.22 : style === "broad" ? 0.08 : 0.1;
      const upsideBonus = (cand.upsidePct / 100) * upsideWeight;
      const sectorPenalty =
        sectorCount(cand.sector) * (style === "growth" ? 0.03 : 0.07);
      const ind = cand.industry || "";
      const industryPenalty =
        ind && industryCount(ind) > 0
          ? style === "broad"
            ? 0.08
            : 0.04
          : 0;
      const fit = style
        ? styleFitBonus(style, cand.industry, cand.sector)
        : 0;

      // Lower score wins (same as before); subtract fit so better affinity wins.
      const score =
        betaPenalty -
        sharpeBonus -
        upsideBonus +
        sectorPenalty +
        industryPenalty -
        fit;
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
    ...(style ? { buildStyle: style } : {}),
  };
}
