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
    if (isMockBuilderEnabled()) {
      const stocks = await provider.getStocks();
      const portfolio = buildPortfolio(stocks, tickers, MAX_HOLDINGS);
      return NextResponse.json(portfolio);
    }

    const portfolio = await buildFromPicks(tickers, MAX_HOLDINGS);
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
