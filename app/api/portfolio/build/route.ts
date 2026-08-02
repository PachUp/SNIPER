import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import {
  buildPortfolio,
  MAX_HOLDINGS,
  MAX_USER_PICKS,
  MIN_USER_PICKS,
} from "@/lib/portfolio";
import { isMockBuilderEnabled } from "@/lib/builder/config";
import { BuilderError, buildFromPicks } from "@/lib/builder/run";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { enrichPortfolioWithBlurbs } from "@/lib/builder/map";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tickers: string[] = Array.isArray(body?.tickers)
    ? body.tickers.map((t: unknown) => String(t).toUpperCase())
    : [];

  if (tickers.length < MIN_USER_PICKS || tickers.length > MAX_USER_PICKS) {
    return NextResponse.json(
      {
        error: `Pick between ${MIN_USER_PICKS} and ${MAX_USER_PICKS} famous stocks.`,
        min: MIN_USER_PICKS,
        max: MAX_USER_PICKS,
      },
      { status: 400 }
    );
  }

  try {
    let portfolio;
    if (isMockBuilderEnabled()) {
      const [stocks, blurbs] = await Promise.all([
        provider.getStocks(),
        loadCompanyBlurbs(),
      ]);
      portfolio = enrichPortfolioWithBlurbs(
        buildPortfolio(stocks, tickers, MAX_HOLDINGS),
        stocks,
        blurbs
      );
    } else {
      portfolio = await buildFromPicks(tickers, MAX_HOLDINGS);
    }
    // Seed AI-filled names into the catalog so desk can edit EP/TP/SL.
    await provider.ensureHoldingsInCatalog(portfolio);
    const { ensureLogosAsync } = await import("@/lib/logos/ensureLogo");
    ensureLogosAsync([
      ...tickers,
      ...portfolio.holdings.map((h) => h.ticker),
    ]);
    return NextResponse.json(portfolio);
  } catch (err) {
    if (err instanceof BuilderError) {
      return NextResponse.json(
        { error: err.message, ...err.details },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
