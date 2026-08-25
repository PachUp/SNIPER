import { NextResponse } from "next/server";
import { BuilderError, listFamousPicks } from "@/lib/builder/run";
import { isMockBuilderEnabled } from "@/lib/builder/config";
import { provider } from "@/lib/data";
import { FAMOUS_MOCK } from "@/lib/builder/mockFamous";
import type { FamousListResult } from "@/lib/builder/map";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { loadFamousSymbols } from "@/lib/builder/famousList";
import { withLivePrices } from "@/lib/stocks/withLivePrices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Attach catalog + StockAnalysis blurbs so every pick shows business + entry. */
async function withStockCopy(data: FamousListResult): Promise<FamousListResult> {
  const [stocksRaw, blurbs] = await Promise.all([
    provider.getStocks(),
    loadCompanyBlurbs(),
  ]);
  const { stocks } = await withLivePrices(stocksRaw);
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  return {
    ...data,
    picks: data.picks.map((p) => {
      const s = byTicker.get(p.symbol);
      const blurb = blurbs.get(p.symbol);
      return {
        ...p,
        name: p.name ?? s?.name,
        business: blurb?.headline ?? p.business ?? s?.business,
        reasoning:
          blurb?.entry ?? p.reasoning ?? s?.reasoning ?? undefined,
        numbers: blurb?.numbers ?? p.numbers ?? s?.numbers,
        levels: s?.levels ?? p.levels,
        price: s?.price ?? p.price,
        upside_pct:
          typeof s?.upsidePct === "number" ? s.upsidePct : p.upside_pct,
      };
    }),
  };
}

export async function GET() {
  try {
    if (isMockBuilderEnabled()) {
      const [stocks, famous] = await Promise.all([
        provider.getStocks(),
        loadFamousSymbols(),
      ]);
      return NextResponse.json(
        await withStockCopy(FAMOUS_MOCK(stocks, famous))
      );
    }
    // Ensure runtime famous file exists before Builder reads --famous-file.
    await loadFamousSymbols();
    const data = await listFamousPicks();
    return NextResponse.json(await withStockCopy(data));
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
