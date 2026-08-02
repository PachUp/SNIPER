import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import {
  builderFvDir,
  builderPython,
  builderUniverse,
  isMockBuilderEnabled,
} from "@/lib/builder/config";
import {
  getUniverseMeta,
  normalizeGicsSector,
} from "@/lib/builder/universeMeta";
import { readCollection } from "@/lib/data/store";
import { fetchQuotes } from "@/lib/quotes/fmp";
import type { GicsSector, Stock } from "@/lib/types";

const execFileAsync = promisify(execFile);

export type FvLookupResult = {
  symbol: string;
  name?: string;
  price: number;
  fair_value: number;
  upside_pct: number;
  beta: number;
  industry: string;
  sector: string;
};

function blankIndustry(value: string): boolean {
  const t = value.trim().toLowerCase();
  return !t || t === "unknown" || t === "n/a" || t === "na" || t === "none";
}

/** Catalog / soft-launch lookup when Python FvIndustries is unavailable. */
async function lookupFromCatalog(symbol: string): Promise<FvLookupResult> {
  const sym = symbol.toUpperCase().trim();
  const stocks = await readCollection<Stock[]>("stocks.json");
  const s = stocks.find((row) => row.ticker.toUpperCase() === sym);
  if (!s) {
    throw new Error(`Symbol ${sym} not found in catalog`);
  }

  let price = Number(s.price) || 0;
  try {
    const quotes = await fetchQuotes([sym]);
    const live = quotes[sym]?.price;
    if (typeof live === "number" && live > 0) price = live;
  } catch {
    // keep catalog price
  }

  const fairValue = Number(s.fairValue) || price;
  const upsidePct =
    price > 0 && fairValue > 0
      ? ((fairValue - price) / price) * 100
      : Number(s.upsidePct) || 0;

  return {
    symbol: sym,
    name: s.name || sym,
    price,
    fair_value: fairValue,
    upside_pct: upsidePct,
    beta: Number(s.beta) || 1,
    industry: s.industry || "",
    sector: s.sector || "Information Technology",
  };
}

/** Look up blended fair value + price/beta from local FvIndustries files. */
export async function lookupSymbolFromFv(
  symbol: string
): Promise<FvLookupResult> {
  if (isMockBuilderEnabled()) {
    return lookupFromCatalog(symbol);
  }

  const script = path.join(process.cwd(), "valuation", "lookup_symbol.py");
  try {
    const { stdout } = await execFileAsync(
      builderPython(),
      [
        script,
        symbol.toUpperCase(),
        "--fv-dir",
        builderFvDir(),
        "--universe",
        builderUniverse(),
      ],
      { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout.trim()) as FvLookupResult & {
      error?: string;
    };
    if (data.error || !data.symbol) {
      throw new Error(data.error || `Symbol ${symbol} not found in FvIndustries`);
    }
    // Belt-and-suspenders: enrich from universe if Python still returns Unknown.
    const uni = await getUniverseMeta(data.symbol);
    const industry = !blankIndustry(data.industry)
      ? data.industry
      : uni?.industry || data.industry;
    const sector = normalizeGicsSector(data.sector || uni?.sector);
    const name =
      (data.name && data.name !== data.symbol ? data.name : null) ||
      uni?.name ||
      data.symbol;
    return {
      ...data,
      name,
      industry,
      sector,
    };
  } catch (err) {
    try {
      return await lookupFromCatalog(symbol);
    } catch {
      // keep original error below
    }
    const e = err as { stdout?: string; message?: string };
    if (e.stdout?.trim()) {
      try {
        const data = JSON.parse(e.stdout.trim()) as { error?: string };
        if (data.error) throw new Error(data.error);
      } catch (inner) {
        if (inner instanceof Error && inner.message.includes("not found")) {
          throw inner;
        }
      }
    }
    throw new Error(
      e.message || `FvIndustries lookup failed for ${symbol.toUpperCase()}`
    );
  }
}

export function stockPatchFromFv(fv: FvLookupResult) {
  const price = fv.price;
  const fairValue = fv.fair_value;
  return {
    ticker: fv.symbol,
    name: fv.name && fv.name !== fv.symbol ? fv.name : fv.symbol,
    sector: normalizeGicsSector(fv.sector) as GicsSector,
    industry: blankIndustry(fv.industry) ? undefined : fv.industry,
    price,
    fairValue,
    upsidePct: fv.upside_pct,
    beta: fv.beta,
    sharpe: 0,
    levels: {
      ep: Number(price.toFixed(2)),
      tp: Number(fairValue.toFixed(2)),
      sl: Number((price * 0.9).toFixed(2)),
    },
  };
}
