import { getUniverseMetaMap } from "@/lib/builder/universeMeta";
import { promises as fs } from "fs";
import path from "path";
import { builderFvDir, isMockBuilderEnabled } from "@/lib/builder/config";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { loadAddUniverse, type AddUniverseRow } from "@/lib/builder/addUniverse";
import { readCollection } from "@/lib/data/store";
import type { Stock } from "@/lib/types";

export type FvSearchHit = {
  ticker: string;
  name: string;
  industry: string;
  sector?: string;
  price: number;
  fairValue: number;
  upsidePct: number;
  /** False when levels will be provisional (no desk FV). */
  hasFv?: boolean;
};

type RankedRow = {
  symbol: string;
  industry: string;
  price: number;
  fv: number;
  upside_pct: number;
};

let rankedCache: RankedRow[] | null = null;
let rankedMtime = "";

function blankIndustry(value: string): boolean {
  const t = value.trim().toLowerCase();
  return !t || t === "unknown" || t === "n/a" || t === "na" || t === "none";
}

async function loadRanked(): Promise<RankedRow[]> {
  const file = path.join(builderFvDir(), "all_upside_ranked.json");
  let mtime = "0";
  try {
    const st = await fs.stat(file);
    mtime = String(st.mtimeMs);
  } catch {
    // missing
  }
  if (rankedCache && rankedMtime === mtime) return rankedCache;

  const raw = await fs.readFile(file, "utf-8");
  const data = JSON.parse(raw) as { stocks?: RankedRow[] };
  rankedCache = (data.stocks ?? []).map((r) => ({
    symbol: String(r.symbol || "").toUpperCase(),
    industry: String(r.industry || ""),
    price: Number(r.price) || 0,
    fv: Number(r.fv) || 0,
    upside_pct: Number(r.upside_pct) || 0,
  }));
  rankedMtime = mtime;
  return rankedCache;
}

async function nameLookup(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const stocks = await readCollection<Stock[]>("stocks.json");
    for (const s of stocks) {
      if (s.ticker && s.name) names.set(s.ticker.toUpperCase(), s.name);
    }
  } catch {
    // catalog optional
  }
  try {
    const blurbs = await loadCompanyBlurbs();
    for (const [ticker, blurb] of blurbs) {
      if (names.has(ticker)) continue;
      const head = (blurb.headline || "").split(/[.!,]/)[0]?.trim();
      if (head && head.length <= 48) names.set(ticker, head);
    }
  } catch {
    // blurbs optional
  }
  return names;
}

function toHit(
  row: RankedRow,
  names: Map<string, string>,
  universe: Awaited<ReturnType<typeof getUniverseMetaMap>>
): FvSearchHit {
  const uni = universe.get(row.symbol);
  const industry = !blankIndustry(row.industry)
    ? row.industry
    : uni?.industry || row.industry;
  return {
    ticker: row.symbol,
    name: names.get(row.symbol) || uni?.name || row.symbol,
    industry,
    sector: uni?.sector,
    price: row.price,
    fairValue: row.fv,
    upsidePct: row.upside_pct,
    hasFv: true,
  };
}

function addRowToHit(row: AddUniverseRow): FvSearchHit {
  return {
    ticker: row.ticker,
    name: row.name || row.ticker,
    industry: row.industry || "",
    sector: row.sector,
    price: row.price ?? 0,
    fairValue: row.fairValue ?? 0,
    upsidePct: row.upsidePct ?? 0,
    hasFv: row.hasFv,
  };
}

function scoreHit(hit: FvSearchHit, q: string): number {
  if (!q) return 1;
  const name = hit.name.toUpperCase();
  const industry = hit.industry.toUpperCase();
  const sector = (hit.sector || "").toUpperCase();
  if (hit.ticker === q) return 100;
  if (hit.ticker.startsWith(q)) return 80;
  if (hit.ticker.includes(q)) return 60;
  if (name.startsWith(q) || name.includes(` ${q}`)) return 50;
  if (name.includes(q)) return 40;
  if (industry.includes(q)) return 20;
  if (sector.includes(q)) return 15;
  return 0;
}

/** Soft-launch / full-universe search over committed add_universe.json. */
async function searchAddUniverse(
  query: string,
  opts?: { limit?: number; exclude?: Set<string> }
): Promise<FvSearchHit[]> {
  const limit = opts?.limit ?? 12;
  const exclude = opts?.exclude ?? new Set<string>();
  const rows = await loadAddUniverse();
  if (rows.length === 0) return [];

  const q = query.trim().toUpperCase();
  const available = rows.filter((r) => r.ticker && !exclude.has(r.ticker));

  if (!q) {
    return available
      .slice()
      .sort((a, b) => {
        if (a.hasFv !== b.hasFv) return a.hasFv ? -1 : 1;
        return (b.upsidePct || 0) - (a.upsidePct || 0);
      })
      .slice(0, limit)
      .map(addRowToHit);
  }

  const scored: { hit: FvSearchHit; score: number; upside: number }[] = [];
  for (const row of available) {
    const hit = addRowToHit(row);
    const score = scoreHit(hit, q);
    if (score > 0) {
      scored.push({ hit, score, upside: hit.upsidePct });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Boolean(a.hit.hasFv) !== Boolean(b.hit.hasFv)) {
      return a.hit.hasFv ? -1 : 1;
    }
    return b.upside - a.upside;
  });
  return scored.slice(0, limit).map(({ hit }) => hit);
}

/** Last-resort: tiny site catalog only. */
async function searchCatalog(
  query: string,
  opts?: { limit?: number; exclude?: Set<string> }
): Promise<FvSearchHit[]> {
  const limit = opts?.limit ?? 12;
  const exclude = opts?.exclude ?? new Set<string>();
  const stocks = await readCollection<Stock[]>("stocks.json");
  const q = query.trim().toUpperCase();
  const available = stocks.filter(
    (s) => s.ticker && !exclude.has(s.ticker.toUpperCase())
  );

  const toCatalogHit = (s: Stock): FvSearchHit => ({
    ticker: s.ticker.toUpperCase(),
    name: s.name || s.ticker,
    industry: s.industry || s.sector || "",
    sector: s.sector,
    price: Number(s.price) || 0,
    fairValue: Number(s.fairValue) || 0,
    upsidePct: Number(s.upsidePct) || 0,
    hasFv: Number(s.fairValue) > 0,
  });

  if (!q) {
    return available
      .slice()
      .sort((a, b) => (b.upsidePct || 0) - (a.upsidePct || 0))
      .slice(0, limit)
      .map(toCatalogHit);
  }

  const scored: { hit: FvSearchHit; score: number; upside: number }[] = [];
  for (const s of available) {
    const hit = toCatalogHit(s);
    const score = scoreHit(hit, q);
    if (score > 0) scored.push({ hit, score, upside: hit.upsidePct });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.upside - a.upside;
  });
  return scored.slice(0, limit).map(({ hit }) => hit);
}

async function searchDeployable(
  query: string,
  opts?: { limit?: number; exclude?: Set<string> }
): Promise<FvSearchHit[]> {
  const fromAdd = await searchAddUniverse(query, opts);
  if (fromAdd.length > 0) return fromAdd;
  return searchCatalog(query, opts);
}

/**
 * Search add-universe (~1527) / Fv ranked (~805) by ticker, industry, or name.
 * Soft-launch uses committed add_universe.json (not the tiny site catalog alone).
 */
export async function searchFvUniverse(
  query: string,
  opts?: { limit?: number; exclude?: Set<string> }
): Promise<FvSearchHit[]> {
  const limit = opts?.limit ?? 12;
  const exclude = opts?.exclude ?? new Set<string>();

  if (isMockBuilderEnabled()) {
    return searchDeployable(query, opts);
  }

  let ranked: RankedRow[];
  try {
    ranked = await loadRanked();
  } catch {
    return searchDeployable(query, opts);
  }
  if (ranked.length === 0) {
    return searchDeployable(query, opts);
  }

  const [names, universe] = await Promise.all([
    nameLookup(),
    getUniverseMetaMap().catch(() => new Map()),
  ]);
  const q = query.trim().toUpperCase();

  const available = ranked.filter((r) => r.symbol && !exclude.has(r.symbol));

  let hits: FvSearchHit[];
  if (!q) {
    hits = available
      .slice()
      .sort((a, b) => b.upside_pct - a.upside_pct)
      .slice(0, limit)
      .map((r) => toHit(r, names, universe));
  } else {
    const scored: { row: RankedRow; score: number }[] = [];
    for (const row of available) {
      const hit = toHit(row, names, universe);
      const score = scoreHit(hit, q);
      if (score > 0) scored.push({ row, score });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.row.upside_pct - a.row.upside_pct;
    });
    hits = scored.slice(0, limit).map(({ row }) => toHit(row, names, universe));
  }

  // Fill remaining slots from full StockAnalysis add-universe (names without FV).
  if (q && hits.length < limit) {
    const seen = new Set([...exclude, ...hits.map((h) => h.ticker)]);
    const more = await searchAddUniverse(query, {
      limit: limit - hits.length,
      exclude: seen,
    });
    hits = [...hits, ...more];
  }

  return hits;
}
