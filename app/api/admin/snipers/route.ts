import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import type { HousePortfolio, SniperHolding } from "@/lib/types";
import { warmLogos } from "@/lib/warmLogos";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";

export const dynamic = "force-dynamic";

/**
 * Draft a house holding from LEVELS & STOCKS (trades already in play).
 * Copies name/sector/industry/thesis + planned levels as a starting point;
 * admin then edits EP/TP/SL to their actual entry — those stay on the book only.
 */
async function holdingFromLevels(symbol: string): Promise<SniperHolding> {
  const ticker = symbol.toUpperCase().trim();
  const stock = await provider.getStock(ticker);
  if (!stock) {
    throw new Error(
      `${ticker} is not in LEVELS & STOCKS — add it there first, then add it to the book.`
    );
  }
  const blurbs = await loadCompanyBlurbs();
  const blurb = blurbs.get(ticker);

  return {
    ticker: stock.ticker,
    name: stock.name || ticker,
    sector: stock.sector,
    industry: stock.industry,
    business: blurb?.headline || stock.business || "",
    reasoning: blurb?.entry || stock.reasoning || "",
    numbers: blurb?.numbers || stock.numbers,
    weightPct: 0,
    levels: {
      ep: stock.levels.ep,
      tp: stock.levels.tp,
      sl: stock.levels.sl,
    },
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  // Add holding from LEVELS catalog (symbol box).
  if (body?.fromLevels === true || (body?.ticker && !body?.portfolio)) {
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
      const holding = await holdingFromLevels(ticker);
      warmLogos([holding.ticker]);
      await appendAudit({
        action: "Draft house holding from LEVELS",
        details: `${holding.ticker}: starting EP ${holding.levels.ep} (edit to actual entry)`,
      });
      return NextResponse.json({ ok: true, holding, fromLevels: true });
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

  const portfolio = body?.portfolio as HousePortfolio;
  if (!portfolio || !Array.isArray(portfolio.holdings)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const saved = await provider.saveHousePortfolio(portfolio);
  warmLogos(saved.holdings.map((h) => h.ticker));
  await appendAudit({
    action: "Save house portfolio",
    details: `${saved.name}: ${saved.holdings.length} holding(s)`,
  });
  return NextResponse.json({ ok: true, portfolio: saved });
}
