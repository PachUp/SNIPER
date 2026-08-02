import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import { GICS_SECTORS } from "@/lib/types";
import { warmLogos } from "@/lib/warmLogos";
import { lookupSymbolFromFv, stockPatchFromFv } from "@/lib/builder/fvLookup";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { describeCompany } from "@/lib/builder/map";

export const dynamic = "force-dynamic";

type FvPayload = {
  ticker?: string;
  name?: string;
  sector?: string;
  industry?: string;
  price?: number;
  fairValue?: number;
  upsidePct?: number;
  beta?: number;
  levels?: { ep: number; tp: number; sl: number };
  business?: string;
  entry?: string;
  reasoning?: string;
  error?: string;
};

const SECTOR_ALIASES: Record<string, (typeof GICS_SECTORS)[number]> = {
  "AI Sector": "Information Technology",
  Technology: "Information Technology",
  Healthcare: "Health Care",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  "Financial Services": "Financials",
  Communications: "Communication Services",
  "Basic Materials": "Materials",
};

function normalizeSector(raw: string): (typeof GICS_SECTORS)[number] {
  if ((GICS_SECTORS as readonly string[]).includes(raw)) {
    return raw as (typeof GICS_SECTORS)[number];
  }
  const alias = SECTOR_ALIASES[raw] || SECTOR_ALIASES[raw.trim()];
  if (alias) return alias;
  const hit = GICS_SECTORS.find((s) => s.toLowerCase() === raw.toLowerCase());
  return hit ?? "Information Technology";
}

async function lookupFromFv(symbol: string): Promise<FvPayload> {
  const fv = await lookupSymbolFromFv(symbol);
  const patch = stockPatchFromFv(fv);
  const blurbs = await loadCompanyBlurbs();
  const blurb = blurbs.get(symbol.toUpperCase());
  const business =
    blurb?.headline ||
    describeCompany({
      ticker: symbol,
      sector: patch.sector,
      industry: fv.industry,
      upsidePct: fv.upside_pct,
      beta: fv.beta,
    });
  const entry =
    blurb?.entry ||
    (() => {
      const up = fv.upside_pct;
      const bits = [
        `${fv.industry}`,
        up >= 15
          ? `~${up.toFixed(0)}% below our fair value`
          : up <= -10
            ? `~${Math.abs(up).toFixed(0)}% above our fair value`
            : null,
      ].filter(Boolean);
      return bits.join(" — ") + ".";
    })();
  return {
    ticker: patch.ticker,
    name: patch.name,
    sector: patch.sector,
    industry: patch.industry,
    price: patch.price,
    fairValue: patch.fairValue,
    upsidePct: patch.upsidePct,
    beta: patch.beta,
    levels: patch.levels,
    business,
    entry,
    reasoning: entry,
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "")
    .toUpperCase()
    .trim();
  if (!ticker) {
    return NextResponse.json({ ok: false, error: "ticker required" }, { status: 400 });
  }

  // Default: pull blended FV from FvIndustries when adding / refreshing a symbol.
  const useFv = body?.fromFv !== false;
  const existing = await provider.getStock(ticker);
  let fv: FvPayload | null = null;
  if (useFv && body?.skipFv !== true) {
    // Only auto-lookup when creating or when explicitly requested.
    if (!existing || body?.fromFv === true) {
      try {
        fv = await lookupFromFv(ticker);
      } catch (err) {
        if (!existing) {
          return NextResponse.json(
            {
              ok: false,
              error:
                err instanceof Error
                  ? err.message
                  : `Symbol ${ticker} not found in FvIndustries`,
            },
            { status: 404 }
          );
        }
      }
    }
  }

  const sector = normalizeSector(
    String(
      body?.sector ?? fv?.sector ?? existing?.sector ?? "Information Technology"
    )
  );
  const industryRaw = String(
    body?.industry ?? fv?.industry ?? existing?.industry ?? ""
  ).trim();
  const industry =
    industryRaw && !["unknown", "n/a", "na", "none"].includes(industryRaw.toLowerCase())
      ? industryRaw
      : existing?.industry;

  const levels = body?.levels ?? fv?.levels;

  // Never wipe hand-edited EP/TP/SL when refreshing from FV unless caller
  // explicitly sends new levels (or replaceLevels: true).
  const replaceLevels = body?.replaceLevels === true || body?.levels != null;
  const nextLevels =
    replaceLevels &&
    levels &&
    typeof levels.ep === "number" &&
    typeof levels.tp === "number" &&
    typeof levels.sl === "number"
      ? { ep: levels.ep, tp: levels.tp, sl: levels.sl }
      : existing
      ? undefined
      : levels &&
        typeof levels.ep === "number" &&
        typeof levels.tp === "number" &&
        typeof levels.sl === "number"
      ? { ep: levels.ep, tp: levels.tp, sl: levels.sl }
      : undefined;

  const stock = await provider.upsertStock({
    ticker,
    name: body?.name != null ? String(body.name) : fv?.name ?? existing?.name ?? ticker,
    sector,
    industry,
    price:
      typeof body?.price === "number"
        ? body.price
        : typeof fv?.price === "number"
        ? fv.price
        : undefined,
    fairValue:
      typeof body?.fairValue === "number"
        ? body.fairValue
        : typeof fv?.fairValue === "number"
        ? fv.fairValue
        : undefined,
    upsidePct:
      typeof body?.upsidePct === "number"
        ? body.upsidePct
        : typeof fv?.upsidePct === "number"
        ? fv.upsidePct
        : undefined,
    beta:
      typeof body?.beta === "number"
        ? body.beta
        : typeof fv?.beta === "number"
        ? fv.beta
        : undefined,
    sharpe: typeof body?.sharpe === "number" ? body.sharpe : undefined,
    reasoning:
      body?.reasoning != null
        ? String(body.reasoning)
        : fv?.entry ?? fv?.reasoning,
    business:
      body?.business != null ? String(body.business) : fv?.business,
    alternatives: Array.isArray(body?.alternatives)
      ? body.alternatives.map((a: unknown) => String(a).toUpperCase())
      : undefined,
    levels: nextLevels,
  });

  const business = body?.business ?? fv?.business;
  const entry = body?.entry ?? fv?.entry ?? body?.reasoning ?? fv?.reasoning;
  if (business != null || entry != null) {
    await provider.saveBlurb(ticker, {
      headline: String(business ?? ""),
      entry: String(entry ?? ""),
    });
  }

  await appendAudit({
    action: useFv && fv ? "Add/update stock from FvIndustries" : "Upsert stock",
    details: `${stock.ticker}: FV ${stock.fairValue} · EP ${stock.levels.ep} / TP ${stock.levels.tp} / SL ${stock.levels.sl}`,
  });
  warmLogos([stock.ticker]);
  return NextResponse.json({
    ok: true,
    stock: {
      ...stock,
      business: business ?? stock.business,
      entry: entry ?? undefined,
    },
    fromFv: Boolean(fv),
  });
}
