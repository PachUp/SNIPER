export const GICS_SECTORS = [
  "Energy",
  "Materials",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Health Care",
  "Financials",
  "Information Technology",
  "Communication Services",
  "Utilities",
  "Real Estate",
] as const;

export type GicsSector = (typeof GICS_SECTORS)[number];

export type Levels = {
  ep: number;
  tp: number;
  sl: number;
};

export type Stock = {
  ticker: string;
  name: string;
  sector: GicsSector;
  price: number;
  fairValue: number;
  upsidePct: number;
  beta: number;
  sharpe: number;
  reasoning: string;
  levels: Levels;
  alternatives: string[];
};

export type Sentiment = "good" | "bad";

export type NewsItem = {
  id: string;
  tickers: string[];
  line: string;
  details?: string;
  sentiment: Sentiment;
  sourceUrl: string;
  source: string;
  timestamp: string;
};

export type Idea = {
  id: string;
  ticker: string;
  name: string;
  sector: GicsSector;
  thesis: string;
  upsidePct: number;
  levels: Levels;
};

export type SniperHolding = {
  ticker: string;
  name: string;
  sector: GicsSector;
  reasoning: string;
  weightPct: number;
  levels: Levels;
};

export type PerfPoint = {
  t: string;
  pct: number;
};

export type HousePortfolio = {
  name: string;
  updated: string;
  holdings: SniperHolding[];
  performance: {
    "1W": PerfPoint[];
    "1M": PerfPoint[];
    "1Y": PerfPoint[];
  };
};

export type AuditEntry = {
  time: string;
  action: string;
  details?: string;
};

export type HoldingSnapshot = {
  name?: string;
  sector?: string;
  industry?: string;
  price?: number;
  fairValue?: number;
  upsidePct?: number;
  beta?: number;
  sharpe?: number;
};

export type PortfolioHolding = {
  ticker: string;
  source: "user" | "ai";
  weightPct?: number;
  /** Snapshot from the Python Builder so the dashboard can render without mock stocks.json. */
  snapshot?: HoldingSnapshot;
};

export type BuiltPortfolio = {
  createdAt: string;
  holdings: PortfolioHolding[];
  portfolioBeta?: number;
  portfolioUpsidePct?: number;
};
