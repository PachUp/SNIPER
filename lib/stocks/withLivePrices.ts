import type { Stock } from "@/lib/types";
import { fetchQuotes } from "@/lib/quotes/fmp";

/**
 * Overlay live FMP market prices onto catalog rows.
 * Desk EP/TP/SL are left untouched — only `price` (and optional live meta) update.
 */
export async function withLivePrices(stocks: Stock[]): Promise<{
  stocks: Stock[];
  asOf: string | null;
  liveCount: number;
}> {
  const symbols = stocks.map((s) => s.ticker).filter(Boolean);
  if (symbols.length === 0 || !(process.env.FMP_API_KEY || "").trim()) {
    return { stocks, asOf: null, liveCount: 0 };
  }

  try {
    const quotes = await fetchQuotes(symbols);
    const asOf = new Date().toISOString();
    let liveCount = 0;
    const next = stocks.map((s) => {
      const q = quotes[s.ticker.toUpperCase()];
      if (!q || !(q.price > 0)) return s;
      liveCount += 1;
      return {
        ...s,
        price: Math.round(q.price * 100) / 100,
      };
    });
    return { stocks: next, asOf, liveCount };
  } catch (err) {
    console.warn(
      "[withLivePrices]",
      err instanceof Error ? err.message : err
    );
    return { stocks, asOf: null, liveCount: 0 };
  }
}
