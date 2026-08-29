#!/usr/bin/env node
/**
 * Build data/add_universe.json from StockAnalysis universe ∪ FvIndustries ranked.
 * Deploy ships this snapshot so Netlify can search/lookup without Mac paths.
 *
 * Env (optional):
 *   SNIPER_UNIVERSE  — extracted_symbols_newest.json
 *   SNIPER_FV_DIR    — FvIndustries-0-0-
 *   SNIPER_BLURBS_FILE — company_blurbs.json for short names
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HOME = process.env.HOME || "";
const HOME_DOCS = path.join(HOME, "Documents", "StockAnalysis");

const UNIVERSE =
  process.env.SNIPER_UNIVERSE?.trim() ||
  path.join(HOME_DOCS, "NoamShit", "extracted_symbols_newest.json");
const FV_DIR =
  process.env.SNIPER_FV_DIR?.trim() ||
  path.join(HOME_DOCS, "FvIndustries-0-0-");
const RANKED = path.join(FV_DIR, "all_upside_ranked.json");
const BLURBS =
  process.env.SNIPER_BLURBS_FILE?.trim() ||
  path.join(HOME_DOCS, "NoamShit", "company_blurbs.json");
const SEED_BLURBS = path.join(ROOT, "data", "company_blurbs.json");
const OUT = path.join(ROOT, "data", "add_universe.json");

const GICS = new Set([
  "Information Technology",
  "Health Care",
  "Financials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Communication Services",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
]);

const SECTOR_ALIASES = {
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

function normalizeSector(value) {
  const raw = String(value || "").trim();
  if (GICS.has(raw)) return raw;
  const alias = SECTOR_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  for (const s of GICS) {
    if (s.toLowerCase() === raw.toLowerCase()) return s;
  }
  return "Information Technology";
}

function blankIndustry(value) {
  const t = String(value || "")
    .trim()
    .toLowerCase();
  return !t || t === "unknown" || t === "n/a" || t === "na" || t === "none";
}

function remember(map, sym, sector, industry, name) {
  const ticker = String(sym || "")
    .toUpperCase()
    .trim();
  if (!ticker) return;
  const prev = map.get(ticker);
  let industryOut = prev?.industry || "";
  if (!blankIndustry(industry)) {
    if (!industryOut || industry.trim().length >= industryOut.length) {
      industryOut = industry.trim();
    }
  }
  map.set(ticker, {
    sector: normalizeSector(sector || prev?.sector),
    industry: industryOut,
    name:
      name && name !== ticker
        ? String(name).trim()
        : prev?.name && prev.name !== ticker
          ? prev.name
          : name || ticker,
  });
}

function ingestNested(map, sectorsTree) {
  for (const [sectorName, industries] of Object.entries(sectorsTree || {})) {
    if (!industries || typeof industries !== "object") continue;
    for (const [industryName, finvizMap] of Object.entries(industries)) {
      if (!finvizMap || typeof finvizMap !== "object") continue;
      for (const [finvizIndustry, rows] of Object.entries(finvizMap)) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const finviz = String(
            row.original_finviz_industry || finvizIndustry || ""
          );
          let industry = String(
            row.industry ||
              row.original_finviz_industry ||
              (!blankIndustry(industryName) ? industryName : finviz) ||
              ""
          );
          if (blankIndustry(industry) && !blankIndustry(finviz)) {
            industry = finviz;
          }
          remember(
            map,
            row.symbol || row.ticker,
            sectorName,
            industry,
            row.company_name || row.name || ""
          );
        }
      }
    }
  }
}

function loadUniverseMeta() {
  const map = new Map();
  if (!existsSync(UNIVERSE)) {
    console.error(`Universe missing: ${UNIVERSE}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(UNIVERSE, "utf8"));

  for (const sym of data.all_symbols || []) {
    remember(map, sym, "", "", "");
  }
  for (const row of data.symbols || data.stocks || []) {
    if (!row || typeof row !== "object") continue;
    remember(
      map,
      row.symbol || row.ticker,
      row.sector,
      row.industry || row.original_finviz_industry,
      row.company_name || row.name
    );
  }
  if (data.sectors && typeof data.sectors === "object") {
    ingestNested(map, data.sectors);
  }
  if (data.by_symbol && typeof data.by_symbol === "object") {
    for (const [sym, meta] of Object.entries(data.by_symbol)) {
      if (!meta || typeof meta !== "object") continue;
      remember(
        map,
        sym,
        meta.sector,
        meta.industry,
        meta.company_name || meta.name
      );
    }
  }
  return map;
}

function loadRanked() {
  const bySym = new Map();
  if (!existsSync(RANKED)) {
    console.warn(`Ranked FV missing: ${RANKED}`);
    return bySym;
  }
  const data = JSON.parse(readFileSync(RANKED, "utf8"));
  for (const r of data.stocks || []) {
    const sym = String(r.symbol || "")
      .toUpperCase()
      .trim();
    if (!sym) continue;
    bySym.set(sym, {
      price: Number(r.price) || 0,
      fv: Number(r.fv) || 0,
      upside_pct: Number(r.upside_pct) || 0,
      industry: String(r.industry || ""),
    });
  }
  return bySym;
}

function loadBlurbNames() {
  const names = new Map();
  for (const file of [BLURBS, SEED_BLURBS]) {
    if (!existsSync(file)) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const entries =
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.entries(data)
        : [];
    for (const [ticker, blurb] of entries) {
      if (!blurb || typeof blurb !== "object") continue;
      const head = String(blurb.headline || "")
        .split(/[.!,]/)[0]
        ?.trim();
      if (head && head.length <= 48) {
        names.set(String(ticker).toUpperCase(), head);
      }
    }
  }
  return names;
}

function main() {
  const meta = loadUniverseMeta();
  const ranked = loadRanked();
  const blurbNames = loadBlurbNames();

  // Ensure ranked-only symbols still appear (catalog extras).
  for (const [sym, row] of ranked) {
    if (!meta.has(sym)) {
      remember(meta, sym, "", row.industry, "");
    }
  }

  const rows = [];
  for (const [ticker, m] of [...meta.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const fv = ranked.get(ticker);
    const hasFv = Boolean(fv && fv.fv > 0);
    const name =
      (m.name && m.name !== ticker ? m.name : null) ||
      blurbNames.get(ticker) ||
      ticker;
    const industry =
      (!blankIndustry(m.industry) ? m.industry : null) ||
      (fv && !blankIndustry(fv.industry) ? fv.industry : "") ||
      "";
    const row = {
      ticker,
      name,
      sector: m.sector || "Information Technology",
      industry,
      hasFv,
    };
    if (hasFv) {
      row.price = Number(fv.price.toFixed(2));
      row.fairValue = Number(fv.fv.toFixed(2));
      row.upsidePct = Number(fv.upside_pct.toFixed(1));
    }
    rows.push(row);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    fvCount: rows.filter((r) => r.hasFv).length,
    rows,
  };

  writeFileSync(OUT, JSON.stringify(payload) + "\n");
  console.log(
    `Wrote ${OUT} — ${payload.count} symbols (${payload.fvCount} with FV)`
  );
}

main();
