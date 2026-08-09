import type { NewsItem, Stock } from "@/lib/types";

export type HoldingRef = {
  ticker: string;
  sector?: string;
  industry?: string;
};

export type HoldingNewsItem = NewsItem & {
  /** User holdings this story may affect (direct ticker or same industry/sector). */
  affects: string[];
  /** Why each affected ticker matched. */
  affectWhy: Record<string, "holding" | "industry" | "sector">;
};

function norm(s?: string): string {
  return (s || "").trim().toLowerCase();
}

/**
 * Keep only news that touches the user’s holdings — by ticker, or by
 * industry/sector of names mentioned in the story.
 */
export function filterNewsForHoldings(
  news: NewsItem[],
  holdings: HoldingRef[],
  catalog: Stock[]
): HoldingNewsItem[] {
  if (!holdings.length) return [];

  const holdByTicker = new Map(
    holdings.map((h) => [h.ticker.toUpperCase(), h])
  );
  const holdTickers = new Set(holdByTicker.keys());

  const catalogByTicker = new Map(
    catalog.map((s) => [s.ticker.toUpperCase(), s])
  );

  const out: HoldingNewsItem[] = [];

  for (const item of news) {
    const newsTickers = (item.tickers || []).map((t) => t.toUpperCase());
    const affects = new Set<string>();
    const affectWhy: Record<string, "holding" | "industry" | "sector"> = {};

    // Direct: story names a holding
    for (const t of newsTickers) {
      if (holdTickers.has(t)) {
        affects.add(t);
        affectWhy[t] = "holding";
      }
    }

    // Industry / sector: story names peers in the same industry or sector
    const peerIndustries = new Set<string>();
    const peerSectors = new Set<string>();
    for (const t of newsTickers) {
      const row = catalogByTicker.get(t);
      if (!row) continue;
      const ind = norm(row.industry);
      const sec = norm(row.sector);
      if (ind) peerIndustries.add(ind);
      if (sec) peerSectors.add(sec);
    }

    for (const [ticker, h] of holdByTicker) {
      if (affects.has(ticker)) continue;
      const ind = norm(h.industry);
      const sec = norm(h.sector);
      if (ind && peerIndustries.has(ind)) {
        affects.add(ticker);
        affectWhy[ticker] = "industry";
        continue;
      }
      if (sec && peerSectors.has(sec)) {
        affects.add(ticker);
        affectWhy[ticker] = "sector";
      }
    }

    if (affects.size === 0) continue;

    out.push({
      ...item,
      affects: [...affects].sort(),
      affectWhy,
    });
  }

  return out;
}
