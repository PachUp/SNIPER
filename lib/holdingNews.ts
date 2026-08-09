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

const MAX_PER_HOLDING = 2;

/**
 * For each held ticker: keep up to 2 newest stories that name that ticker.
 * No industry/sector peer stretch — only direct ticker links.
 */
export function filterNewsForHoldings(
  news: NewsItem[],
  holdings: HoldingRef[],
  _catalog: Stock[]
): HoldingNewsItem[] {
  if (!holdings.length) return [];

  const holdTickers = holdings.map((h) => h.ticker.toUpperCase());
  const byId = new Map<string, HoldingNewsItem>();

  for (const ticker of holdTickers) {
    const matches = news
      .filter((item) =>
        (item.tickers || []).some((t) => t.toUpperCase() === ticker)
      )
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, MAX_PER_HOLDING);

    for (const item of matches) {
      const existing = byId.get(item.id);
      if (existing) {
        if (!existing.affectWhy[ticker]) {
          existing.affects.push(ticker);
          existing.affects.sort();
          existing.affectWhy[ticker] = "holding";
        }
        continue;
      }
      byId.set(item.id, {
        ...item,
        affects: [ticker],
        affectWhy: { [ticker]: "holding" },
      });
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
