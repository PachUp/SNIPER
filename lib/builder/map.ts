import type {
  BuiltPortfolio,
  GicsSector,
  PortfolioHolding,
  Stock,
} from "@/lib/types";

export type CompanyBlurb = {
  headline: string;
  entry: string;
  /** Fundamental numbers shown only when the user clicks. */
  numbers?: string;
};

function formatBlurbText(blurb: CompanyBlurb): string {
  if (blurb.headline && blurb.entry) {
    return `${blurb.headline} ${blurb.entry}`;
  }
  return blurb.entry || blurb.headline;
}

export type BuilderHolding = {
  symbol: string;
  weight_pct: number;
  beta: number;
  upside_pct: number | null;
  sharpe_ratio: number | null;
  sortino_ratio?: number | null;
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
  name?: string;
  business?: string;
  reasoning?: string;
  numbers?: string;
  beta?: number;
  upside_pct?: number | null;
  price?: number | null;
  fair_value?: number | null;
  industry?: string;
  sector?: string | null;
  sharpe_ratio?: number | null;
  sortino_ratio?: number | null;
  reason?: string | null;
  levels?: { ep: number; tp: number; sl: number };
};

export type FamousListResult = {
  min_manual_picks: number;
  max_manual_picks: number;
  famous_min_upside_pct: number;
  eligible: string[];
  picks: FamousPick[];
  built_at: string;
};

/** Company-facing blurb when a ticker is not in the mock catalog. */
export function describeCompany(input: {
  ticker: string;
  sector?: string | null;
  industry?: string | null;
  upsidePct?: number | null;
  beta?: number | null;
}): string {
  const industry = (input.industry || "").trim();
  const sector = (input.sector || "").trim();
  const business =
    industry && industry.toUpperCase() !== input.ticker.toUpperCase()
      ? industry
      : sector || null;

  let sentence: string;
  if (business && sector && business !== sector) {
    sentence = `${business} company in the ${sector} sector.`;
  } else if (business) {
    sentence = `${business} company.`;
  } else {
    sentence = `${input.ticker} — public company holding.`;
  }

  const upside = input.upsidePct;
  if (upside != null && Number.isFinite(upside)) {
    if (upside >= 40) {
      sentence += " Significant upside versus estimated fair value.";
    } else if (upside >= 20) {
      sentence += " Attractive upside versus estimated fair value.";
    } else if (upside > 0) {
      sentence += " Modest upside versus estimated fair value.";
    }
  }

  const beta = input.beta;
  if (beta != null && Number.isFinite(beta)) {
    if (beta >= 1.3) {
      sentence += " Higher-volatility expression of the theme.";
    } else if (beta <= 0.75) {
      sentence += " Lower-volatility ballast in the sleeve.";
    }
  }

  return sentence;
}

const GENERIC_REASONING = "Selected by the SNIPER portfolio builder.";

function copyFromBlurb(blurb?: CompanyBlurb): {
  business?: string;
  reasoning?: string;
  numbers?: string;
} {
  if (!blurb) return {};
  return {
    business: blurb.headline || undefined,
    reasoning: blurb.entry || formatBlurbText(blurb) || undefined,
    numbers: blurb.numbers || undefined,
  };
}

export function mapBuilderResult(
  data: BuilderPortfolioResult,
  catalog: Stock[] = [],
  blurbs: Map<string, CompanyBlurb> = new Map()
): BuiltPortfolio {
  const byTicker = new Map(catalog.map((s) => [s.ticker, s]));
  const holdings: PortfolioHolding[] = (data.holdings ?? []).map((h) => {
    const known = byTicker.get(h.symbol);
    const blurb = blurbs.get(h.symbol);
    const fromBlurb = copyFromBlurb(blurb);
    const sector = h.sector ?? known?.sector ?? undefined;
    const industry = h.industry || known?.sector;
    const upsidePct = h.upside_pct ?? known?.upsidePct ?? undefined;
    const beta = h.beta ?? known?.beta;
    const reasoning =
      fromBlurb.reasoning ??
      known?.reasoning ??
      describeCompany({
        ticker: h.symbol,
        sector,
        industry,
        upsidePct,
        beta,
      });
    const business = fromBlurb.business ?? known?.business;
    return {
      ticker: h.symbol,
      source: (h.user_pick ? "user" : "ai") as "user" | "ai",
      weightPct: h.weight_pct,
      snapshot: {
        name:
          known?.name ??
          (industry && industry !== h.symbol ? industry : h.symbol),
        sector,
        industry: h.industry,
        price: h.price ?? known?.price ?? undefined,
        fairValue: h.fair_value ?? known?.fairValue ?? undefined,
        upsidePct,
        beta,
        sharpe: h.sharpe_ratio ?? known?.sharpe ?? undefined,
        sortino: h.sortino_ratio ?? known?.sortino ?? undefined,
        business,
        reasoning,
        numbers: fromBlurb.numbers ?? known?.numbers,
      },
    };
  });

  return {
    createdAt: data.built_at ?? new Date().toISOString(),
    holdings,
    portfolioBeta: data.portfolio_beta,
    portfolioUpsidePct: data.portfolio_upside_pct,
  };
}

/** Attach StockAnalysis blurbs onto a mock-built portfolio (ticker-only holdings). */
export function enrichPortfolioWithBlurbs(
  portfolio: BuiltPortfolio,
  catalog: Stock[] = [],
  blurbs: Map<string, CompanyBlurb> = new Map()
): BuiltPortfolio {
  const byTicker = new Map(catalog.map((s) => [s.ticker, s]));
  return {
    ...portfolio,
    holdings: portfolio.holdings.map((h) => {
      const known = byTicker.get(h.ticker);
      const blurb = blurbs.get(h.ticker);
      const fromBlurb = copyFromBlurb(blurb);
      const industry = h.snapshot?.industry ?? known?.sector;
      const sector = h.snapshot?.sector ?? known?.sector;
      const upsidePct = h.snapshot?.upsidePct ?? known?.upsidePct;
      const beta = h.snapshot?.beta ?? known?.beta;
      const reasoning =
        fromBlurb.reasoning ??
        h.snapshot?.reasoning ??
        known?.reasoning ??
        describeCompany({
          ticker: h.ticker,
          sector,
          industry,
          upsidePct,
          beta,
        });
      const business =
        fromBlurb.business ?? h.snapshot?.business ?? known?.business;
      return {
        ...h,
        snapshot: {
          ...h.snapshot,
          name: known?.name ?? h.snapshot?.name ?? h.ticker,
          sector,
          industry,
          price: h.snapshot?.price ?? known?.price,
          fairValue: h.snapshot?.fairValue ?? known?.fairValue,
          upsidePct,
          beta,
          sharpe: h.snapshot?.sharpe ?? known?.sharpe,
          sortino: h.snapshot?.sortino ?? known?.sortino,
          business,
          reasoning,
          numbers: fromBlurb.numbers ?? h.snapshot?.numbers ?? known?.numbers,
        },
      };
    }),
  };
}

/** Overlay StockAnalysis blurbs onto catalog stocks for API responses. */
export function applyBlurbsToStocks(
  stocks: Stock[],
  blurbs: Map<string, CompanyBlurb>
): Stock[] {
  if (blurbs.size === 0) return stocks;
  return stocks.map((s) => {
    const blurb = blurbs.get(s.ticker);
    if (!blurb) return s;
    const fromBlurb = copyFromBlurb(blurb);
    return {
      ...s,
      business: fromBlurb.business ?? s.business,
      reasoning: fromBlurb.reasoning ?? s.reasoning,
      numbers: fromBlurb.numbers ?? s.numbers,
    };
  });
}

/** Build a display Stock from a portfolio holding snapshot (for dashboard). */
export function stockFromHolding(
  h: PortfolioHolding,
  catalog?: Map<string, Stock> | Stock[]
): Stock | null {
  const snap = h.snapshot;
  if (!snap && !h.ticker) return null;
  const byTicker =
    catalog instanceof Map
      ? catalog
      : new Map((catalog ?? []).map((s) => [s.ticker, s]));
  const known = byTicker.get(h.ticker);
  const price = snap?.price ?? known?.price ?? 0;
  const fairValue = snap?.fairValue ?? known?.fairValue ?? price;
  const sector =
    (snap?.sector as GicsSector | undefined) ??
    known?.sector ??
    "Information Technology";
  const industry = snap?.industry ?? known?.industry;
  const upsidePct = snap?.upsidePct ?? known?.upsidePct ?? 0;
  const beta = snap?.beta ?? known?.beta ?? 1;
  const snapReasoning =
    snap?.reasoning && snap.reasoning !== GENERIC_REASONING
      ? snap.reasoning
      : undefined;
  const reasoning =
    snapReasoning ??
    known?.reasoning ??
    describeCompany({
      ticker: h.ticker,
      sector,
      industry,
      upsidePct,
      beta,
    });
  const business = snap?.business ?? known?.business;
  const displayName =
    known?.name ??
    (snap?.name && snap.name !== h.ticker ? snap.name : undefined) ??
    industry ??
    h.ticker;
  return {
    ticker: h.ticker,
    name: displayName,
    sector,
    industry: industry || undefined,
    price,
    fairValue,
    upsidePct,
    beta,
    sharpe: snap?.sharpe ?? known?.sharpe ?? 0,
    sortino: snap?.sortino ?? known?.sortino,
    business,
    reasoning,
    numbers: snap?.numbers ?? known?.numbers,
    levels: known?.levels ?? {
      ep: price,
      tp: fairValue > price ? fairValue : price * 1.15,
      sl: price > 0 ? Number((price * 0.9).toFixed(2)) : 0,
    },
    alternatives: known?.alternatives ?? [],
  };
}
