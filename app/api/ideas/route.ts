import { NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";

export const dynamic = "force-dynamic";

export async function GET() {
  const [ideas, blurbs] = await Promise.all([
    provider.getIdeas(),
    loadCompanyBlurbs(),
  ]);
  return NextResponse.json(
    ideas.map((idea) => {
      const blurb = blurbs.get(idea.ticker);
      if (!blurb) return idea;
      return {
        ...idea,
        business: blurb.headline,
        // Prefer curated idea thesis; fall back to StockAnalysis entry.
        thesis: idea.thesis || blurb.entry,
        entry: blurb.entry,
        numbers: blurb.numbers || idea.numbers,
      };
    })
  );
}
