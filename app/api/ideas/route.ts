import { NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { applyDeskLevelsToIdea } from "@/lib/ideaDesk";

export const dynamic = "force-dynamic";

export async function GET() {
  const [ideas, stocks, blurbs] = await Promise.all([
    provider.getIdeas(),
    provider.getStocks(),
    loadCompanyBlurbs(),
  ]);
  const desk = new Map(stocks.map((s) => [s.ticker.toUpperCase(), s]));
  return NextResponse.json(
    ideas.map((idea) => {
      const fromDesk = applyDeskLevelsToIdea(
        idea,
        desk.get(idea.ticker.toUpperCase())
      );
      const blurb = blurbs.get(fromDesk.ticker);
      if (!blurb) return fromDesk;
      return {
        ...fromDesk,
        business: blurb.headline || fromDesk.business,
        thesis: fromDesk.thesis || blurb.entry,
        entry: fromDesk.entry || blurb.entry,
        numbers: blurb.numbers || fromDesk.numbers,
      };
    })
  );
}
