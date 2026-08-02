import { NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";

export const dynamic = "force-dynamic";

export async function GET() {
  const [portfolio, blurbs] = await Promise.all([
    provider.getHousePortfolio(),
    loadCompanyBlurbs(),
  ]);
  return NextResponse.json({
    ...portfolio,
    holdings: portfolio.holdings.map((h) => {
      const blurb = blurbs.get(h.ticker);
      if (!blurb) return h;
      return {
        ...h,
        business: blurb.headline,
        reasoning: blurb.entry || h.reasoning,
        numbers: blurb.numbers || h.numbers,
      };
    }),
  });
}
