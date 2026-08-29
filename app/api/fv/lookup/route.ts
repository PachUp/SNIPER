import { NextRequest, NextResponse } from "next/server";
import { lookupSymbolFromFv, stockPatchFromFv } from "@/lib/builder/fvLookup";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { describeCompany } from "@/lib/builder/map";
import { readCollection } from "@/lib/data/store";
import type { Stock } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Look up a symbol in FvIndustries and return catalog-ready fields + blurb. */
export async function GET(req: NextRequest) {
  const symbol = String(req.nextUrl.searchParams.get("symbol") || "")
    .toUpperCase()
    .trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  try {
    const fv = await lookupSymbolFromFv(symbol);
    const patch = stockPatchFromFv(fv);
    let catalogName: string | undefined;
    let catalogAlts: string[] = [];
    try {
      const stocks = await readCollection<Stock[]>("stocks.json");
      const known = stocks.find((s) => s.ticker.toUpperCase() === symbol);
      if (known?.name) catalogName = known.name;
      if (known?.alternatives?.length) catalogAlts = known.alternatives;
    } catch {
      // catalog optional
    }
    const blurbs = await loadCompanyBlurbs();
    const blurb = blurbs.get(symbol);
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
        if (fv.provisional) {
          return `${fv.industry || "Stock"} — provisional buy / sell / exit from live price (no desk fair value yet).`;
        }
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
    return NextResponse.json({
      ...patch,
      name: catalogName || patch.name,
      industry: patch.industry || fv.industry,
      business,
      entry,
      reasoning: entry,
      alternatives: catalogAlts,
      provisional: Boolean(fv.provisional),
      hasFv: fv.hasFv !== false && !fv.provisional,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
