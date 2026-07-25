import type {
  Stock,
  NewsItem,
  Idea,
  HousePortfolio,
  Levels,
} from "@/lib/types";
import { readCollection, writeCollection } from "./store";

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

  // Admin writes
  updateStockLevels(ticker: string, levels: Levels): Promise<Stock>;
  updateStockAlternatives(
    ticker: string,
    alternatives: string[]
  ): Promise<Stock>;
  saveIdeas(ideas: Idea[]): Promise<Idea[]>;
  saveNews(news: NewsItem[]): Promise<NewsItem[]>;
  saveHousePortfolio(portfolio: HousePortfolio): Promise<HousePortfolio>;
}

class MockProvider implements DataProvider {
  async getStocks(): Promise<Stock[]> {
    return readCollection<Stock[]>("stocks.json");
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
    return readCollection<HousePortfolio>("snipers.json");
  }

  async updateStockLevels(ticker: string, levels: Levels): Promise<Stock> {
    const stocks = await this.getStocks();
    const idx = stocks.findIndex((s) => s.ticker === ticker.toUpperCase());
    if (idx === -1) throw new Error(`Unknown ticker: ${ticker}`);
    stocks[idx] = { ...stocks[idx], levels };
    await writeCollection("stocks.json", stocks);
    return stocks[idx];
  }

  async updateStockAlternatives(
    ticker: string,
    alternatives: string[]
  ): Promise<Stock> {
    const stocks = await this.getStocks();
    const idx = stocks.findIndex((s) => s.ticker === ticker.toUpperCase());
    if (idx === -1) throw new Error(`Unknown ticker: ${ticker}`);
    stocks[idx] = {
      ...stocks[idx],
      alternatives: alternatives.map((a) => a.toUpperCase()),
    };
    await writeCollection("stocks.json", stocks);
    return stocks[idx];
  }

  async saveIdeas(ideas: Idea[]): Promise<Idea[]> {
    return writeCollection("ideas.json", ideas);
  }

  async saveNews(news: NewsItem[]): Promise<NewsItem[]> {
    return writeCollection("news.json", news);
  }

  async saveHousePortfolio(
    portfolio: HousePortfolio
  ): Promise<HousePortfolio> {
    return writeCollection("snipers.json", portfolio);
  }
}

// Swap this line to point the entire site at your valuation software later.
export const provider: DataProvider = new MockProvider();
