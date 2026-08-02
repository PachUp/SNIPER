import { promises as fs } from "fs";
import { builderUniverse } from "@/lib/builder/config";
import { GICS_SECTORS, type GicsSector } from "@/lib/types";

export type UniverseSymbolMeta = {
  sector: GicsSector;
  industry: string;
  name: string;
};

const SECTOR_ALIASES: Record<string, GicsSector> = {
  "ai sector": "Information Technology",
  technology: "Information Technology",
  "info tech": "Information Technology",
  "information tech": "Information Technology",
  tech: "Information Technology",
  healthcare: "Health Care",
  "health care": "Health Care",
  "consumer cyclical": "Consumer Discretionary",
  "consumer defensive": "Consumer Staples",
  "financial services": "Financials",
  communications: "Communication Services",
  "communication services": "Communication Services",
  "basic materials": "Materials",
};

export function normalizeGicsSector(value: string | null | undefined): GicsSector {
  const raw = String(value || "").trim();
  if ((GICS_SECTORS as readonly string[]).includes(raw)) {
    return raw as GicsSector;
  }
  const alias = SECTOR_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  const hit = GICS_SECTORS.find((s) => s.toLowerCase() === raw.toLowerCase());
  return hit ?? "Information Technology";
}

function blankIndustry(value: string): boolean {
  const t = value.trim().toLowerCase();
  return !t || t === "unknown" || t === "n/a" || t === "na" || t === "none";
}

let cache: Map<string, UniverseSymbolMeta> | null = null;
let cacheMtime = "";

function remember(
  map: Map<string, UniverseSymbolMeta>,
  sym: string,
  sector: string,
  industry: string,
  name: string
) {
  const ticker = sym.toUpperCase().trim();
  if (!ticker) return;
  const prev = map.get(ticker);
  const nextIndustry =
    !blankIndustry(industry) && (!prev || blankIndustry(prev.industry))
      ? industry.trim()
      : prev?.industry || (!blankIndustry(industry) ? industry.trim() : "");
  // Prefer a more specific Finviz label when both exist
  let industryOut = nextIndustry;
  if (
    prev?.industry &&
    !blankIndustry(industry) &&
    industry.trim().toLowerCase() !== prev.industry.toLowerCase() &&
    industry.length >= prev.industry.length
  ) {
    industryOut = industry.trim();
  }
  map.set(ticker, {
    sector: normalizeGicsSector(sector || prev?.sector),
    industry: industryOut || prev?.industry || "",
    name:
      name && name !== ticker
        ? name.trim()
        : prev?.name && prev.name !== ticker
          ? prev.name
          : name || ticker,
  });
}

function ingestNested(
  map: Map<string, UniverseSymbolMeta>,
  sectorsTree: Record<string, unknown>
) {
  for (const [sectorName, industries] of Object.entries(sectorsTree)) {
    if (!industries || typeof industries !== "object") continue;
    for (const [industryName, finvizMap] of Object.entries(
      industries as Record<string, unknown>
    )) {
      if (!finvizMap || typeof finvizMap !== "object") continue;
      for (const [finvizIndustry, rows] of Object.entries(
        finvizMap as Record<string, unknown>
      )) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          const sym = String(r.symbol || r.ticker || "");
          const finviz = String(
            r.original_finviz_industry || finvizIndustry || ""
          );
          let industry = String(
            r.industry ||
              r.original_finviz_industry ||
              (!blankIndustry(industryName) ? industryName : finviz) ||
              ""
          );
          if (blankIndustry(industry) && !blankIndustry(finviz)) {
            industry = finviz;
          } else if (
            !blankIndustry(finviz) &&
            finviz.toLowerCase() !== industry.toLowerCase()
          ) {
            industry = finviz;
          }
          remember(
            map,
            sym,
            sectorName,
            industry,
            String(r.company_name || r.name || "")
          );
        }
      }
    }
  }
}

async function buildMap(): Promise<Map<string, UniverseSymbolMeta>> {
  const map = new Map<string, UniverseSymbolMeta>();
  try {
    const file = builderUniverse();
    const st = await fs.stat(file);
    const mtime = String(st.mtimeMs);
    if (cache && cacheMtime === mtime) return cache;

    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;

    for (const row of (data.symbols as unknown[]) ||
      (data.stocks as unknown[]) ||
      []) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      remember(
        map,
        String(r.symbol || r.ticker || ""),
        String(r.sector || ""),
        String(r.industry || r.original_finviz_industry || ""),
        String(r.company_name || r.name || "")
      );
    }

    if (data.sectors && typeof data.sectors === "object") {
      ingestNested(map, data.sectors as Record<string, unknown>);
    }

    if (data.by_symbol && typeof data.by_symbol === "object") {
      for (const [sym, meta] of Object.entries(
        data.by_symbol as Record<string, unknown>
      )) {
        if (!meta || typeof meta !== "object") continue;
        const m = meta as Record<string, unknown>;
        remember(
          map,
          sym,
          String(m.sector || ""),
          String(m.industry || ""),
          String(m.company_name || m.name || "")
        );
      }
    }

    cache = map;
    cacheMtime = mtime;
  } catch {
    // universe optional
  }
  return map;
}

export async function getUniverseMeta(
  symbol: string
): Promise<UniverseSymbolMeta | undefined> {
  const map = await buildMap();
  return map.get(symbol.toUpperCase());
}

export async function getUniverseMetaMap(): Promise<
  Map<string, UniverseSymbolMeta>
> {
  return buildMap();
}
