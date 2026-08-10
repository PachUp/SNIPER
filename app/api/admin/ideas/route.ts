import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import type { Idea } from "@/lib/types";
import { warmLogos } from "@/lib/warmLogos";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";

export const dynamic = "force-dynamic";

/**
 * Draft an idea from LEVELS & STOCKS + company blurbs
 * (name, sector, industry, business, entry thesis, numbers, EP/TP/SL).
 */
async function ideaFromLevels(symbol: string): Promise<Idea> {
  const ticker = symbol.toUpperCase().trim();
  const stock = await provider.getStock(ticker);
  if (!stock) {
    throw new Error(
      `${ticker} is not in LEVELS & STOCKS — add it there first, then add it to Ideas.`
    );
  }
  const blurbs = await loadCompanyBlurbs();
  const blurb = blurbs.get(ticker);

  const business = blurb?.headline || stock.business || "";
  const entry = blurb?.entry || stock.reasoning || "";
  const numbers = blurb?.numbers || stock.numbers;
  const ep = stock.levels.ep;
  const tp = stock.levels.tp;
  const upsidePct =
    ep > 0
      ? Math.round(((tp - ep) / ep) * 1000) / 10
      : stock.upsidePct ?? 0;

  return {
    id: `i${Date.now()}`,
    ticker: stock.ticker,
    name: stock.name || ticker,
    sector: stock.sector,
    industry: stock.industry,
    thesis: entry,
    business,
    entry,
    numbers,
    upsidePct,
    levels: {
      ep,
      tp,
      sl: stock.levels.sl,
    },
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  // Add / preview a single idea from LEVELS & STOCKS.
  if (body?.fromLevels === true || (body?.ticker && !Array.isArray(body?.ideas))) {
    const ticker = String(body?.ticker ?? "")
      .toUpperCase()
      .trim();
    if (!ticker) {
      return NextResponse.json(
        { ok: false, error: "ticker required" },
        { status: 400 }
      );
    }
    try {
      const idea = await ideaFromLevels(ticker);
      warmLogos([idea.ticker]);
      await appendAudit({
        action: "Draft idea from LEVELS",
        details: `${idea.ticker}: EP ${idea.levels.ep} / TP ${idea.levels.tp} / SL ${idea.levels.sl}`,
      });
      return NextResponse.json({ ok: true, idea, fromLevels: true });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : `Symbol ${ticker} not found in LEVELS`,
        },
        { status: 404 }
      );
    }
  }

  // Bulk save curated list — ideas store only; does not touch LEVELS or house book.
  const ideas: Idea[] = (Array.isArray(body?.ideas) ? body.ideas : []).map(
    (idea) => {
      const ep = Number(idea?.levels?.ep);
      const tp = Number(idea?.levels?.tp);
      if (Number.isFinite(ep) && Number.isFinite(tp) && ep > 0) {
        return {
          ...idea,
          upsidePct: Math.round(((tp - ep) / ep) * 1000) / 10,
        };
      }
      return idea;
    }
  );
  const saved = await provider.saveIdeas(ideas);
  warmLogos(saved.map((i) => i.ticker));
  await appendAudit({
    action: "Save ideas",
    details: `${saved.length} idea(s) published`,
  });
  return NextResponse.json({ ok: true, ideas: saved });
}
