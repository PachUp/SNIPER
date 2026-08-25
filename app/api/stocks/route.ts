import { NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { applyBlurbsToStocks } from "@/lib/builder/map";
import { withLivePrices } from "@/lib/stocks/withLivePrices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [stocks, blurbs] = await Promise.all([
    provider.getStocks(),
    loadCompanyBlurbs(),
  ]);
  const withBlurbs = applyBlurbsToStocks(stocks, blurbs);
  const { stocks: liveStocks, asOf, liveCount } =
    await withLivePrices(withBlurbs);

  return NextResponse.json(liveStocks, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(asOf
        ? {
            "X-SNIPER-Price-As-Of": asOf,
            "X-SNIPER-Live-Quotes": String(liveCount),
          }
        : {}),
    },
  });
}
