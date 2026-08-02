import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import { provider } from "@/lib/data";
import { warmLogos } from "@/lib/warmLogos";
import { isMockBuilderEnabled } from "@/lib/builder/config";
import { BuilderError, buildFromPicks } from "@/lib/builder/run";
import { buildPortfolio, MAX_HOLDINGS } from "@/lib/portfolio";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { enrichPortfolioWithBlurbs } from "@/lib/builder/map";

export const dynamic = "force-dynamic";

/**
 * Build a portfolio for each famous pick (alone) and upsert AI fillers
 * into the shared stocks catalog for EP/TP/SL editing.
 */
export async function POST() {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const famous = await provider.getFamousSymbols();
  const added = new Set<string>();

  for (const symbol of famous) {
    try {
      let portfolio;
      if (isMockBuilderEnabled()) {
        const [stocks, blurbs] = await Promise.all([
          provider.getStocks(),
          loadCompanyBlurbs(),
        ]);
        portfolio = enrichPortfolioWithBlurbs(
          buildPortfolio(stocks, [symbol], MAX_HOLDINGS),
          stocks,
          blurbs
        );
      } else {
        portfolio = await buildFromPicks([symbol], MAX_HOLDINGS);
      }
      await provider.ensureHoldingsInCatalog(portfolio);
      for (const h of portfolio.holdings) {
        if (h.source === "ai") added.add(String(h.ticker).toUpperCase());
      }
    } catch (err) {
      if (err instanceof BuilderError) continue;
      // continue other symbols
    }
  }

  const list = [...added].sort();
  warmLogos([...famous, ...list]);
  await appendAudit({
    action: "Sync auto-fill stocks",
    details: list.join(", ") || "(none)",
  });
  return NextResponse.json({ ok: true, symbols: list, count: list.length });
}
