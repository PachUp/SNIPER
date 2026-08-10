import type {
  Stock,
  NewsItem,
  Idea,
  HousePortfolio,
  Levels,
  GicsSector,
  BuiltPortfolio,
} from "@/lib/types";
import { readCollection, writeCollection } from "./store";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import {
  normalizeGicsSector,
  getUniverseMetaMap,
} from "@/lib/builder/universeMeta";
import { ensureLogoAsync, ensureLogosAsync } from "@/lib/logos/ensureLogo";

/**
 * The single seam between the website and its data source.
 *
 * Today this is backed by mock JSON (MockProvider). To connect your valuation
 * software later, implement this same interface (e.g. SoftwareProvider that
 * calls your API/DB) and swap the `provider` export at the bottom. Nothing else
 * in the app needs to change.
 */
export interface DataProvider {
  getStocks(): Promise<Stock[]>;
  getStock(ticker: string): Promise<Stock | undefined>;
  getNews(): Promise<NewsItem[]>;
  getIdeas(): Promise<Idea[]>;
  getHousePortfolio(): Promise<HousePortfolio>;
  getFamousSymbols(): Promise<string[]>;
  getBlurbs(): Promise<Record<string, CompanyBlurb>>;

  // Admin writes
  updateStockLevels(ticker: string, levels: Levels): Promise<Stock>;
  updateStockAlternatives(
    ticker: string,
    alternatives: string[]
  ): Promise<Stock>;
  upsertStock(stock: Partial<Stock> & { ticker: string }): Promise<Stock>;
  /** Create catalog rows for AI-filled holdings so desk can edit EP/TP/SL. */
  ensureHoldingsInCatalog(portfolio: BuiltPortfolio): Promise<string[]>;
  saveFamousSymbols(symbols: string[]): Promise<string[]>;
  saveBlurb(ticker: string, blurb: CompanyBlurb): Promise<CompanyBlurb>;
  saveIdeas(ideas: Idea[]): Promise<Idea[]>;
  saveNews(news: NewsItem[]): Promise<NewsItem[]>;
  saveHousePortfolio(portfolio: HousePortfolio): Promise<HousePortfolio>;
}

export type FamousStocksFile = {
  symbols?: string[];
  stocks?: { symbol: string; name?: string }[];
};

export type CompanyBlurb = { headline: string; entry: string };

const DEFAULT_FAMOUS = [
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
];

function asSector(value: string | undefined): GicsSector {
  return normalizeGicsSector(value);
}

class MockProvider implements DataProvider {
  async getStocks(): Promise<Stock[]> {
    const stocks = await readCollection<Stock[]>("stocks.json");
    return this.enrichIndustries(stocks);
  }

  /** Fill missing industry (and normalize sector) from the FvIndustries universe. */
  private async enrichIndustries(stocks: Stock[]): Promise<Stock[]> {
    let universe: Awaited<ReturnType<typeof getUniverseMetaMap>>;
    try {
      universe = await getUniverseMetaMap();
    } catch {
      return stocks;
    }
    if (universe.size === 0) return stocks;

    let changed = false;
    const next = stocks.map((s) => {
      const uni = universe.get(s.ticker.toUpperCase());
      if (!uni) return s;
      const industry =
        s.industry && s.industry.trim() && s.industry.toLowerCase() !== "unknown"
          ? s.industry
          : uni.industry || s.industry;
      const sector = asSector(s.sector || uni.sector);
      if (industry === s.industry && sector === s.sector) return s;
      changed = true;
      return { ...s, industry: industry || undefined, sector };
    });
    if (changed) {
      await writeCollection("stocks.json", next);
    }
    return next;
  }

  async getStock(ticker: string): Promise<Stock | undefined> {
    const stocks = await this.getStocks();
    return stocks.find((s) => s.ticker === ticker.toUpperCase());
  }

  async getNews(): Promise<NewsItem[]> {
    const news = await readCollection<NewsItem[]>("news.json");
    return [...news].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getIdeas(): Promise<Idea[]> {
    return readCollection<Idea[]>("ideas.json");
  }

  async getHousePortfolio(): Promise<HousePortfolio> {
    // House book levels are independent (actual entries for trades in play).
    // Do not overlay LEVELS catalog EP/TP/SL onto them.
    return readCollection<HousePortfolio>("snipers.json");
  }

  async getFamousSymbols(): Promise<string[]> {
    try {
      const data = await readCollection<FamousStocksFile>("famous_stocks.json");
      if (Array.isArray(data.symbols) && data.symbols.length > 0) {
        return data.symbols.map((s) => String(s).toUpperCase());
      }
      if (Array.isArray(data.stocks) && data.stocks.length > 0) {
        return data.stocks
          .map((s) => String(s.symbol || "").toUpperCase())
          .filter(Boolean);
      }
    } catch {
      // fall through
    }
    return [...DEFAULT_FAMOUS];
  }

  async getBlurbs(): Promise<Record<string, CompanyBlurb>> {
    try {
      const raw = await readCollection<Record<string, unknown>>(
        "company_blurbs.json"
      );
      const out: Record<string, CompanyBlurb> = {};
      for (const [ticker, value] of Object.entries(raw)) {
        if (!value || typeof value !== "object") continue;
        const row = value as { headline?: unknown; entry?: unknown };
        const headline =
          typeof row.headline === "string" ? row.headline.trim() : "";
        const entry = typeof row.entry === "string" ? row.entry.trim() : "";
        if (!headline && !entry) continue;
        out[ticker.toUpperCase()] = { headline, entry };
      }
      return out;
    } catch {
      return {};
    }
  }

  async updateStockLevels(ticker: string, levels: Levels): Promise<Stock> {
    return this.upsertStock({ ticker, levels });
  }

  async updateStockAlternatives(
    ticker: string,
    alternatives: string[]
  ): Promise<Stock> {
    return this.upsertStock({
      ticker,
      alternatives: alternatives.map((a) => a.toUpperCase()),
    });
  }

  /**
   * LEVELS & STOCKS catalog — used for user auto-picks / portfolio build.
   * Independent from the snipers house book (executed entries).
   */
  async upsertStock(
    patch: Partial<Stock> & { ticker: string }
  ): Promise<Stock> {
    const stocks = await this.getStocks();
    const ticker = patch.ticker.toUpperCase();
    const idx = stocks.findIndex((s) => s.ticker === ticker);
    if (idx === -1) {
      const price = patch.price ?? 0;
      const created: Stock = {
        ticker,
        name: patch.name ?? ticker,
        sector: asSector(patch.sector),
        industry: patch.industry,
        price,
        fairValue: patch.fairValue ?? price,
        upsidePct: patch.upsidePct ?? 0,
        beta: patch.beta ?? 1,
        sharpe: patch.sharpe ?? 0,
        business: patch.business,
        reasoning: patch.reasoning ?? "",
        numbers: patch.numbers,
        levels: patch.levels ?? {
          ep: price,
          tp: price > 0 ? Number((price * 1.15).toFixed(2)) : 0,
          sl: price > 0 ? Number((price * 0.9).toFixed(2)) : 0,
        },
        alternatives: patch.alternatives ?? [],
      };
      stocks.push(created);
      await writeCollection("stocks.json", stocks);
      ensureLogoAsync(ticker);
      return created;
    }
    const next: Stock = {
      ...stocks[idx],
      ...patch,
      ticker,
      levels: patch.levels ?? stocks[idx].levels,
      alternatives: patch.alternatives ?? stocks[idx].alternatives,
    };
    stocks[idx] = next;
    await writeCollection("stocks.json", stocks);
    ensureLogoAsync(ticker);
    return next;
  }

  async ensureHoldingsInCatalog(portfolio: BuiltPortfolio): Promise<string[]> {
    const blurbs = await loadCompanyBlurbs();
    const created: string[] = [];
    for (const h of portfolio.holdings) {
      if (h.source !== "ai") continue;
      const existing = await this.getStock(h.ticker);
      if (existing) continue;
      const snap = h.snapshot;
      const blurb = blurbs.get(h.ticker);
      const price = snap?.price ?? 0;
      const fairValue = snap?.fairValue ?? price;
      await this.upsertStock({
        ticker: h.ticker,
        name: snap?.name && snap.name !== h.ticker ? snap.name : h.ticker,
        sector: asSector(snap?.sector),
        industry: snap?.industry,
        price,
        fairValue,
        upsidePct: snap?.upsidePct ?? 0,
        beta: snap?.beta ?? 1,
        sharpe: snap?.sharpe ?? 0,
        business: blurb?.headline,
        reasoning: blurb?.entry ?? "",
        numbers: blurb?.numbers,
        levels: {
          ep: Number(price.toFixed(2)),
          tp: Number(
            (fairValue > 0 ? fairValue : price > 0 ? price * 1.15 : 0).toFixed(
              2
            )
          ),
          sl: Number((price > 0 ? price * 0.9 : 0).toFixed(2)),
        },
      });
      if (blurb) {
        try {
          const all = await readCollection<
            Record<string, { headline: string; entry: string }>
          >("company_blurbs.json");
          all[h.ticker] = blurb;
          await writeCollection("company_blurbs.json", all);
        } catch {
          // optional
        }
      }
      created.push(h.ticker);
    }
    return created;
  }

  async saveFamousSymbols(symbols: string[]): Promise<string[]> {
    const cleaned = [
      ...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean)),
    ];
    await writeCollection<FamousStocksFile>("famous_stocks.json", {
      symbols: cleaned,
    });
    for (const sym of cleaned) {
      const existing = await this.getStock(sym);
      if (!existing) {
        await this.upsertStock({ ticker: sym, name: sym, upsidePct: 25 });
      }
    }
    ensureLogosAsync(cleaned);
    return cleaned;
  }

  async saveBlurb(
    ticker: string,
    blurb: CompanyBlurb
  ): Promise<CompanyBlurb> {
    const all = await this.getBlurbs();
    const key = ticker.toUpperCase();
    const next = {
      headline: blurb.headline.trim(),
      entry: blurb.entry.trim(),
    };
    all[key] = next;
    await writeCollection("company_blurbs.json", all);
    return next;
  }

  async saveIdeas(ideas: Idea[]): Promise<Idea[]> {
    const saved = await writeCollection("ideas.json", ideas);
    ensureLogosAsync(ideas.map((i) => i.ticker));
    return saved;
  }

  async saveNews(news: NewsItem[]): Promise<NewsItem[]> {
    return writeCollection("news.json", news);
  }

  async saveHousePortfolio(
    portfolio: HousePortfolio
  ): Promise<HousePortfolio> {
    // Persist book as-is. Do NOT push EP/TP/SL into LEVELS & STOCKS —
    // those stay planned levels; the book stores actual entries in play.
    const saved = await writeCollection("snipers.json", portfolio);
    ensureLogosAsync(portfolio.holdings.map((h) => h.ticker));
    return saved;
  }
}

// Swap this line to point the entire site at your valuation software later.
export const provider: DataProvider = new MockProvider();
