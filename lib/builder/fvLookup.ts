import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import {
  builderFvDir,
  builderPython,
  builderUniverse,
  isMockBuilderEnabled,
} from "@/lib/builder/config";
import { getAddUniverseRow } from "@/lib/builder/addUniverse";
import {
  getUniverseMeta,
  normalizeGicsSector,
} from "@/lib/builder/universeMeta";
import { readCollection } from "@/lib/data/store";
import { fetchPriceTargetAverage, fetchQuotes } from "@/lib/quotes/fmp";
import type { GicsSector, Stock } from "@/lib/types";

const execFileAsync = promisify(execFile);
const PROVISIONAL_UPSIDE = 1.15;
const SL_FRAC = 0.9;

export type FvLookupResult = {
  symbol: string;
  name?: string;
  price: number;
  fair_value: number;
  upside_pct: number;
  beta: number;
  industry: string;
  sector: string;
  /** Desk / FvIndustries fair value available. */
  hasFv?: boolean;
  /** Levels synthesized from FMP (no desk FV). */
  provisional?: boolean;
};

function blankIndustry(value: string): boolean {
  const t = value.trim().toLowerCase();
  return !t || t === "unknown" || t === "n/a" || t === "na" || t === "none";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Soft-launch / fallback lookup: site catalog → add_universe → FMP.
 * With FV: use stored fair value. Without: provisional buy/sell/exit.
 */
async function lookupFromCatalog(symbol: string): Promise<FvLookupResult> {
  const sym = symbol.toUpperCase().trim();
  const stocks = await readCollection<Stock[]>("stocks.json").catch(
    () => [] as Stock[]
  );
  const catalog = stocks.find((row) => row.ticker.toUpperCase() === sym);
  const addRow = await getAddUniverseRow(sym);

  if (!catalog && !addRow) {
    throw new Error(`Symbol ${sym} not found in add universe`);
  }

  let price =
    Number(catalog?.price) ||
    Number(addRow?.price) ||
    0;
  let liveName: string | undefined;
  try {
    const quotes = await fetchQuotes([sym]);
    const live = quotes[sym];
    if (typeof live?.price === "number" && live.price > 0) price = live.price;
    if (live?.name) liveName = live.name;
  } catch {
    // keep stored price
  }

  const hasFv = Boolean(
    (catalog && Number(catalog.fairValue) > 0) || addRow?.hasFv
  );
  let fairValue = hasFv
    ? Number(catalog?.fairValue) || Number(addRow?.fairValue) || 0
    : 0;
  let provisional = !hasFv || fairValue <= 0;

  if (provisional) {
    if (!(price > 0)) {
      throw new Error(`No live price for ${sym}`);
    }
    const target = await fetchPriceTargetAverage(sym).catch(() => null);
    fairValue =
      target && target > 0 ? target : round2(price * PROVISIONAL_UPSIDE);
  }

  if (!(price > 0)) price = fairValue > 0 ? round2(fairValue / PROVISIONAL_UPSIDE) : 0;
  if (!(price > 0) || !(fairValue > 0)) {
    throw new Error(`Symbol ${sym} missing price / fair value`);
  }

  const upsidePct = ((fairValue - price) / price) * 100;
  const sector = normalizeGicsSector(
    catalog?.sector || addRow?.sector || "Information Technology"
  );
  const industry =
    (!blankIndustry(catalog?.industry || "")
      ? catalog!.industry
      : null) ||
    (!blankIndustry(addRow?.industry || "") ? addRow!.industry : "") ||
    "";

  return {
    symbol: sym,
    name:
      catalog?.name ||
      (addRow?.name && addRow.name !== sym ? addRow.name : null) ||
      liveName ||
      sym,
    price: round2(price),
    fair_value: round2(fairValue),
    upside_pct: Math.round(upsidePct * 10) / 10,
    beta: Number(catalog?.beta) || Number(addRow?.beta) || 1,
    industry,
    sector,
    hasFv: !provisional,
    provisional,
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
      hasFv: true,
      provisional: false,
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
    provisional: Boolean(fv.provisional),
    hasFv: fv.hasFv !== false && !fv.provisional,
    levels: {
      ep: Number(price.toFixed(2)),
      tp: Number(fairValue.toFixed(2)),
      sl: Number((price * SL_FRAC).toFixed(2)),
    },
  };
}
