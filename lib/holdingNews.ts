import type { NewsItem, Stock } from "@/lib/types";

export type HoldingRef = {
  ticker: string;
  sector?: string;
  industry?: string;
};

export type HoldingNewsItem = NewsItem & {
  /** User holdings named directly in the story (ticker match only). */
  affects: string[];
  /** Why each affected ticker matched — always direct holding. */
  affectWhy: Record<string, "holding">;
};

/**
 * Keep only news that names a ticker the user actually holds.
 * Industry / sector peers are excluded — peers are not the same company.
 */
export function filterNewsForHoldings(
  news: NewsItem[],
  holdings: HoldingRef[],
  _catalog: Stock[]
): HoldingNewsItem[] {
  if (!holdings.length) return [];

  const holdTickers = new Set(holdings.map((h) => h.ticker.toUpperCase()));
  const out: HoldingNewsItem[] = [];

  for (const item of news) {
    const newsTickers = (item.tickers || []).map((t) => t.toUpperCase());
    const affects: string[] = [];
    const affectWhy: Record<string, "holding"> = {};

    for (const t of newsTickers) {
      if (!holdTickers.has(t) || affectWhy[t]) continue;
      affects.push(t);
      affectWhy[t] = "holding";
    }

    if (affects.length === 0) continue;

    out.push({
      ...item,
      affects: affects.sort(),
      affectWhy,
    });
  }

  return out;
}
