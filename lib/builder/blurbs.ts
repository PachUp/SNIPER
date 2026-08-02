import { promises as fs } from "fs";
import path from "path";
import { builderBlurbsFile } from "@/lib/builder/config";
import { readCollection } from "@/lib/data/store";
import type { CompanyBlurb } from "@/lib/builder/map";

export type { CompanyBlurb };

let cache: Map<string, CompanyBlurb> | null = null;
let cacheKey: string | null = null;

function parseBlurbs(data: Record<string, unknown>): Map<string, CompanyBlurb> {
  const map = new Map<string, CompanyBlurb>();
  for (const [ticker, value] of Object.entries(data)) {
    if (!value || typeof value !== "object") continue;
    const row = value as {
      headline?: unknown;
      entry?: unknown;
      numbers?: unknown;
    };
    const headline =
      typeof row.headline === "string" ? row.headline.trim() : "";
    const entry = typeof row.entry === "string" ? row.entry.trim() : "";
    const numbers =
      typeof row.numbers === "string" ? row.numbers.trim() : "";
    if (!headline && !entry) continue;
    map.set(ticker.toUpperCase(), {
      headline,
      entry,
      ...(numbers ? { numbers } : {}),
    });
  }
  return map;
}

async function runtimeBlurbsMtime(): Promise<string> {
  try {
    const dataDir =
      process.env.SNIPER_DATA_DIR?.trim() ||
      path.join(process.cwd(), "data");
    const p = path.join(path.resolve(dataDir), ".runtime", "company_blurbs.json");
    const st = await fs.stat(p);
    return String(st.mtimeMs);
  } catch {
    return "0";
  }
}

/**
 * Load blurbs: prefer admin/runtime `company_blurbs.json`, then StockAnalysis file.
 */
export async function loadCompanyBlurbs(): Promise<Map<string, CompanyBlurb>> {
  const mtime = await runtimeBlurbsMtime();
  const key = `blurbs-v4:${mtime}`;
  if (cache && cacheKey === key) return cache;

  let map = new Map<string, CompanyBlurb>();
  try {
    const data = await readCollection<Record<string, unknown>>(
      "company_blurbs.json"
    );
    map = parseBlurbs(data);
  } catch {
    // try StockAnalysis path
  }

  if (map.size === 0) {
    try {
      const raw = await fs.readFile(builderBlurbsFile(), "utf-8");
      map = parseBlurbs(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      // empty
    }
  }

  if (map.size === 0) {
    try {
      const seed = path.join(process.cwd(), "data", "company_blurbs.json");
      const raw = await fs.readFile(seed, "utf-8");
      map = parseBlurbs(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      // empty
    }
  }

  cache = map;
  cacheKey = key;
  return map;
}

export function clearBlurbsCache(): void {
  cache = null;
  cacheKey = null;
}
