import { promises as fs } from "fs";
import path from "path";
import { normalizeGicsSector } from "@/lib/builder/universeMeta";
import type { GicsSector } from "@/lib/types";

/** Slim committed index for Dashboard “+ My stock” (StockAnalysis ∪ FV). */
export type AddUniverseRow = {
  ticker: string;
  name: string;
  sector: GicsSector | string;
  industry: string;
  price?: number;
  fairValue?: number;
  upsidePct?: number;
  beta?: number;
  hasFv: boolean;
};

type AddUniverseFile = {
  generatedAt?: string;
  count?: number;
  rows: AddUniverseRow[];
};

let cache: AddUniverseRow[] | null = null;
let cacheMtime = "";

function dataRoot(): string {
  const fromEnv = process.env.SNIPER_DATA_DIR?.trim();
  return fromEnv && fromEnv.length > 0
    ? path.resolve(fromEnv)
    : path.join(process.cwd(), "data");
}

function addUniversePath(): string {
  return path.join(dataRoot(), "add_universe.json");
}

function normalizeRow(raw: Record<string, unknown>): AddUniverseRow | null {
  const ticker = String(raw.ticker || raw.symbol || "")
    .toUpperCase()
    .trim();
  if (!ticker) return null;
  const price = Number(raw.price);
  const fairValue = Number(raw.fairValue ?? raw.fv);
  const upsidePct = Number(raw.upsidePct ?? raw.upside_pct);
  const beta = Number(raw.beta);
  const hasFv = Boolean(raw.hasFv) && Number.isFinite(fairValue) && fairValue > 0;
  return {
    ticker,
    name: String(raw.name || ticker).trim() || ticker,
    sector: normalizeGicsSector(String(raw.sector || "")),
    industry: String(raw.industry || "").trim(),
    price: Number.isFinite(price) && price > 0 ? price : undefined,
    fairValue: hasFv ? fairValue : undefined,
    upsidePct: Number.isFinite(upsidePct) ? upsidePct : undefined,
    beta: Number.isFinite(beta) && beta > 0 ? beta : undefined,
    hasFv,
  };
}

/** Load committed add-universe rows (cached by file mtime). */
export async function loadAddUniverse(): Promise<AddUniverseRow[]> {
  const file = addUniversePath();
  let mtime = "0";
  try {
    const st = await fs.stat(file);
    mtime = String(st.mtimeMs);
  } catch {
    return [];
  }
  if (cache && cacheMtime === mtime) return cache;

  try {
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as AddUniverseFile | AddUniverseRow[];
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.rows)
        ? data.rows
        : [];
    cache = list
      .map((row) => normalizeRow(row as unknown as Record<string, unknown>))
      .filter((r): r is AddUniverseRow => r != null);
    cacheMtime = mtime;
    return cache;
  } catch {
    return [];
  }
}

export async function getAddUniverseRow(
  symbol: string
): Promise<AddUniverseRow | null> {
  const sym = symbol.toUpperCase().trim();
  const rows = await loadAddUniverse();
  return rows.find((r) => r.ticker === sym) ?? null;
}
