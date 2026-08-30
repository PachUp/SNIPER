import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import type { Idea } from "@/lib/types";
import { warmLogos } from "@/lib/warmLogos";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { applyDeskLevelsToIdea } from "@/lib/ideaDesk";

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

  const drafted: Idea = {
    id: `i${Date.now()}`,
    ticker: stock.ticker,
    name: stock.name || ticker,
    sector: stock.sector,
    industry: stock.industry,
    thesis: entry,
    business,
    entry,
    numbers,
    upsidePct: stock.upsidePct ?? 0,
    levels: {
      ep: 0,
      tp: 0,
      sl: 0,
    },
  };
  return applyDeskLevelsToIdea(drafted, stock);
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

  // Bulk save curated list — stamp EP/TP/SL from LEVELS & STOCKS; does not edit that catalog.
  const incoming: Idea[] = Array.isArray(body?.ideas) ? body.ideas : [];
  const stocks = await provider.getStocks();
  const desk = new Map(stocks.map((s) => [s.ticker.toUpperCase(), s]));
  const ideas: Idea[] = incoming.map((idea: Idea) => {
    const ticker = String(idea?.ticker || "").toUpperCase();
    return applyDeskLevelsToIdea(
      { ...idea, ticker: ticker || idea.ticker },
      desk.get(ticker)
    );
  });
  const saved = await provider.saveIdeas(ideas);
  warmLogos(saved.map((i) => i.ticker));
  await appendAudit({
    action: "Save ideas",
    details: `${saved.length} idea(s) published`,
  });
  return NextResponse.json({ ok: true, ideas: saved });
}
