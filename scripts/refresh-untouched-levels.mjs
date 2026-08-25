#!/usr/bin/env node
/**
 * Refresh EP / TP / SL for catalog stocks that were NEVER hand-edited in Audit.
 * Frozen tickers (Upsert stock / Add from Fv / Update levels) are left untouched.
 *
 * Sources:
 *   - FMP live quote → EP + price
 *   - StockAnalysis FvIndustries blended FV → TP (preferred)
 *   - FMP price-target consensus → TP fallback
 *   - SL = EP × 0.90
 *
 * Env: FMP_API_KEY (or .env.local)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STOCKS_SEED = path.join(ROOT, "data", "stocks.json");
const STOCKS_RUNTIME = path.join(ROOT, "data", ".runtime", "stocks.json");
const AUDIT = path.join(ROOT, "data", ".runtime", "audit.json");
const FV_DIR =
  process.env.SNIPER_FV_DIR?.trim() ||
  path.join(
    process.env.HOME || "",
    "Documents",
    "StockAnalysis",
    "FvIndustries-0-0-"
  );

const FMP_V3 = "https://financialmodelingprep.com/api/v3";
const FMP_V4 = "https://financialmodelingprep.com/api/v4";
const MIN_UPSIDE_PCT = 5;
const SL_FRAC = 0.9;
const ALIASES = { GOOGL: "GOOG", "BRK.B": "BRK-B", "BRK.A": "BRK-A" };
const FREEZE_ACTIONS = new Set([
  "Upsert stock",
  "Add/update stock from FvIndustries",
  "Update levels",
]);

function loadKey() {
  let key = (process.env.FMP_API_KEY || "").trim();
  if (key) return key;
  const envPath = path.join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf8");
    const m = raw.match(/^FMP_API_KEY=(.+)$/m);
    if (m) key = m[1].trim().replace(/^["']|["']$/g, "");
  }
  return key;
}

function safeFloat(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function freezeSet(audit) {
  const out = new Set();
  for (const e of audit) {
    if (!FREEZE_ACTIONS.has(e.action)) continue;
    const d = String(e.details || "");
    const m = d.match(/^([A-Z][A-Z0-9.\-]{0,9}):/);
    if (m) out.add(m[1]);
  }
  return out;
}

function loadFvIndex() {
  const index = {};
  if (!existsSync(FV_DIR)) {
    console.warn(`FvIndustries dir missing: ${FV_DIR}`);
    return index;
  }
  for (const name of readdirSync(FV_DIR)) {
    if (!name.endsWith("_industry_fair_values.json")) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(path.join(FV_DIR, name), "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(data)) continue;
    for (const block of data) {
      if (!block || typeof block !== "object") continue;
      for (const v of block.valuations || []) {
        const sym = String(v.symbol || "")
          .toUpperCase()
          .trim();
        if (!sym) continue;
        const detail = v.blended_detail || {};
        const meta = v.meta || {};
        const price =
          safeFloat(detail.stock_price) ?? safeFloat(meta.price);
        const fv =
          safeFloat(v.blended_fair_value) ?? safeFloat(detail.fair_value);
        if (fv == null && price == null) continue;
        index[sym] = { price, fv, beta: safeFloat(meta.beta) };
      }
    }
  }
  const ranked = path.join(FV_DIR, "all_upside_ranked.json");
  if (existsSync(ranked)) {
    try {
      const data = JSON.parse(readFileSync(ranked, "utf8"));
      for (const r of data.stocks || []) {
        const sym = String(r.symbol || "")
          .toUpperCase()
          .trim();
        if (!sym || index[sym]) continue;
        index[sym] = {
          price: safeFloat(r.price),
          fv: safeFloat(r.fv),
          beta: null,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return index;
}

async function fetchQuotes(key, symbols) {
  const out = {};
  const chunkSize = 50;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const url = `${FMP_V3}/quote/${chunk.map(encodeURIComponent).join(",")}?apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `FMP quote failed (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`
      );
    }
    const data = await res.json();
    if (!Array.isArray(data)) continue;
    for (const row of data) {
      const sym = String(row.symbol || "").toUpperCase();
      const price = safeFloat(row.price);
      if (!sym || price == null || price <= 0) continue;
      out[sym] = price;
    }
  }
  return out;
}

async function fetchTargetConsensus(key, symbol) {
  const urls = [
    `${FMP_V4}/price-target-consensus?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
    `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row !== "object") continue;
      const tp =
        safeFloat(row.targetConsensus) ??
        safeFloat(row.targetMedian) ??
        safeFloat(row.targetMean) ??
        safeFloat(row.priceTargetAverage) ??
        safeFloat(row.targetHigh);
      if (tp != null && tp > 0) return tp;
    } catch {
      /* try next */
    }
  }
  return null;
}

function appendAudit(action, details) {
  mkdirSync(path.dirname(AUDIT), { recursive: true });
  let existing = [];
  if (existsSync(AUDIT)) {
    try {
      existing = JSON.parse(readFileSync(AUDIT, "utf8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
  }
  const next = [
    { time: new Date().toISOString(), action, details },
    ...existing,
  ].slice(0, 500);
  writeFileSync(AUDIT, JSON.stringify(next, null, 2) + "\n", "utf8");
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error("FMP_API_KEY missing — set env or .env.local");
    process.exit(1);
  }

  if (!existsSync(AUDIT)) {
    console.error(`Audit file missing: ${AUDIT}`);
    process.exit(1);
  }
  const audit = JSON.parse(readFileSync(AUDIT, "utf8"));
  const frozen = freezeSet(audit);
  const stocks = JSON.parse(readFileSync(STOCKS_SEED, "utf8"));
  if (!Array.isArray(stocks)) {
    console.error("stocks.json is not an array");
    process.exit(1);
  }

  const beforeLevels = new Map(
    stocks.map((s) => [
      s.ticker,
      JSON.stringify(s.levels || null) +
        "|" +
        s.price +
        "|" +
        s.fairValue +
        "|" +
        s.upsidePct,
    ])
  );

  const fvIndex = loadFvIndex();
  console.log(`FvIndustries symbols: ${Object.keys(fvIndex).length}`);
  console.log(`Frozen (do not alter): ${[...frozen].sort().join(", ")}`);

  const eligible = stocks
    .map((s) => String(s.ticker || "").toUpperCase())
    .filter((t) => t && !frozen.has(t));
  console.log(`Eligible to refresh: ${eligible.length}`);

  const quoteSyms = [
    ...new Set(
      eligible.flatMap((t) => {
        const a = ALIASES[t];
        return a ? [t, a] : [t];
      })
    ),
  ];
  const quotes = await fetchQuotes(key, quoteSyms);
  console.log(`FMP quotes loaded: ${Object.keys(quotes).length}`);

  const needTarget = eligible.filter((t) => {
    const fv = fvIndex[t] || fvIndex[ALIASES[t] || ""];
    return !(fv && fv.fv != null && fv.fv > 0);
  });

  const targets = {};
  const concurrency = 4;
  for (let i = 0; i < needTarget.length; i += concurrency) {
    const batch = needTarget.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (t) => {
        const lookup = ALIASES[t] || t;
        const tp = await fetchTargetConsensus(key, lookup);
        if (tp != null) targets[t] = tp;
      })
    );
  }
  console.log(`FMP consensus targets: ${Object.keys(targets).length}`);

  const updated = [];
  const skipped = [];

  for (const row of stocks) {
    const ticker = String(row.ticker || "").toUpperCase();
    if (!ticker) continue;
    if (frozen.has(ticker)) continue;

    const live =
      quotes[ticker] ?? quotes[ALIASES[ticker] || ""] ?? null;
    if (live == null || live <= 0) {
      skipped.push({ ticker, reason: "no live quote" });
      continue;
    }

    const fvRow = fvIndex[ticker] || fvIndex[ALIASES[ticker] || ""];
    let tp = null;
    let source = null;
    if (fvRow?.fv != null && fvRow.fv > 0) {
      tp = fvRow.fv;
      source = "fv";
    } else if (targets[ticker] != null) {
      tp = targets[ticker];
      source = "fmp-target";
    } else {
      skipped.push({ ticker, reason: "no FV and no FMP target" });
      continue;
    }

    const ep = live;
    const upside = ((tp - ep) / ep) * 100;
    if (!(tp > ep) || upside < MIN_UPSIDE_PCT) {
      skipped.push({
        ticker,
        reason: `TP not enough upside (EP=${round2(ep)} TP=${round2(tp)} upside=${round1(upside)}%)`,
      });
      continue;
    }

    const sl = round2(ep * SL_FRAC);
    const old = {
      ep: row.levels?.ep,
      tp: row.levels?.tp,
      sl: row.levels?.sl,
      price: row.price,
      fv: row.fairValue,
      up: row.upsidePct,
    };

    row.price = round2(ep);
    row.fairValue = round2(tp);
    row.upsidePct = round1(upside);
    if (fvRow?.beta != null && Number.isFinite(fvRow.beta)) {
      row.beta = round2(fvRow.beta);
    }
    row.levels = {
      ep: round2(ep),
      tp: round2(tp),
      sl,
    };

    updated.push({
      ticker,
      source,
      old,
      neu: {
        ep: row.levels.ep,
        tp: row.levels.tp,
        sl: row.levels.sl,
        up: row.upsidePct,
      },
    });
  }

  const payload = JSON.stringify(stocks, null, 2) + "\n";
  writeFileSync(STOCKS_SEED, payload, "utf8");
  mkdirSync(path.dirname(STOCKS_RUNTIME), { recursive: true });
  writeFileSync(STOCKS_RUNTIME, payload, "utf8");

  appendAudit(
    "Refresh untouched levels",
    `${updated.length} updated · ${skipped.length} skipped · ${frozen.size} frozen`
  );

  // Verify freeze integrity
  let freezeOk = true;
  for (const t of frozen) {
    const row = stocks.find((s) => s.ticker === t);
    if (!row) continue;
    const now =
      JSON.stringify(row.levels || null) +
      "|" +
      row.price +
      "|" +
      row.fairValue +
      "|" +
      row.upsidePct;
    if (beforeLevels.get(t) !== now) {
      freezeOk = false;
      console.error(`FREEZE VIOLATION: ${t} changed`);
    }
  }

  console.log("\n=== UPDATED ===");
  console.log(
    `${"Ticker".padEnd(8)} ${"Src".padEnd(11)} ${"EP".padStart(8)} ${"TP".padStart(8)} ${"SL".padStart(8)} ${"Upside".padStart(8)}`
  );
  for (const u of updated.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    console.log(
      `${u.ticker.padEnd(8)} ${u.source.padEnd(11)} ${String(u.neu.ep).padStart(8)} ${String(u.neu.tp).padStart(8)} ${String(u.neu.sl).padStart(8)} ${String(u.neu.up + "%").padStart(8)}  (was EP ${u.old.ep} / TP ${u.old.tp} / SL ${u.old.sl})`
    );
  }

  console.log(`\n=== SKIPPED (${skipped.length}) ===`);
  for (const s of skipped.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    console.log(`  ${s.ticker}: ${s.reason}`);
  }

  console.log(
    `\nDone. Updated ${updated.length}, skipped ${skipped.length}, frozen ${frozen.size}. Freeze intact: ${freezeOk}`
  );
  if (!freezeOk) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
