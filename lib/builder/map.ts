import type {
  BuiltPortfolio,
  GicsSector,
  PortfolioHolding,
  Stock,
} from "@/lib/types";

export type BuilderHolding = {
  symbol: string;
  weight_pct: number;
  beta: number;
  upside_pct: number | null;
  sharpe_ratio: number | null;
  price: number | null;
  fair_value: number | null;
  industry: string;
  sector: string | null;
  famous: boolean;
  high_upside: boolean;
  user_pick: boolean;
};

export type BuilderPortfolioResult = {
  error?: string;
  allowed_picks?: string[];
  holdings?: BuilderHolding[];
  holdings_count?: number;
  portfolio_beta?: number;
  portfolio_upside_pct?: number;
  built_at?: string;
  user_picks?: string[];
  [key: string]: unknown;
};

export type FamousPick = {
  symbol: string;
  eligible: boolean;
  beta?: number;
  upside_pct?: number | null;
  price?: number | null;
  fair_value?: number | null;
  industry?: string;
  sector?: string | null;
  sharpe_ratio?: number | null;
  reason?: string | null;
};

export type FamousListResult = {
  min_manual_picks: number;
  max_manual_picks: number;
  famous_min_upside_pct: number;
  eligible: string[];
  picks: FamousPick[];
  built_at: string;
};

export function mapBuilderResult(data: BuilderPortfolioResult): BuiltPortfolio {
  const holdings: PortfolioHolding[] = (data.holdings ?? []).map((h) => ({
    ticker: h.symbol,
    source: h.user_pick ? "user" : "ai",
    weightPct: h.weight_pct,
    snapshot: {
      name: h.symbol,
      sector: h.sector ?? undefined,
      industry: h.industry,
      price: h.price ?? undefined,
      fairValue: h.fair_value ?? undefined,
      upsidePct: h.upside_pct ?? undefined,
      beta: h.beta,
      sharpe: h.sharpe_ratio ?? undefined,
    },
  }));

  return {
    createdAt: data.built_at ?? new Date().toISOString(),
    holdings,
    portfolioBeta: data.portfolio_beta,
    portfolioUpsidePct: data.portfolio_upside_pct,
  };
}

/** Build a display Stock from a portfolio holding snapshot (for dashboard). */
export function stockFromHolding(h: PortfolioHolding): Stock | null {
  const snap = h.snapshot;
  if (!snap && !h.ticker) return null;
  const price = snap?.price ?? 0;
  const fairValue = snap?.fairValue ?? price;
  const sector =
    (snap?.sector as GicsSector | undefined) ?? "Information Technology";
  return {
    ticker: h.ticker,
    name: snap?.name ?? h.ticker,
    sector,
    price,
    fairValue,
    upsidePct: snap?.upsidePct ?? 0,
    beta: snap?.beta ?? 1,
    sharpe: snap?.sharpe ?? 0,
    reasoning: "Selected by the SNIPER portfolio builder.",
    levels: {
      ep: price,
      tp: fairValue > price ? fairValue : price * 1.15,
      sl: price > 0 ? Number((price * 0.9).toFixed(2)) : 0,
    },
    alternatives: [],
  };
}
