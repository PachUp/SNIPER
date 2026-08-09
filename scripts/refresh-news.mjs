#!/usr/bin/env node
/**
 * Refresh data/news.json from Financial Modeling Prep stock news.
 * Used by GitHub Actions every 3 days (and runnable locally).
 *
 * Env:
 *   FMP_API_KEY  (required)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SEED = path.join(ROOT, "data", "news.json");
const RUNTIME = path.join(ROOT, "data", ".runtime", "news.json");
const STOCKS = path.join(ROOT, "data", "stocks.json");
const FAMOUS = path.join(ROOT, "data", "famous_stocks.json");
const SNIPERS = path.join(ROOT, "data", "snipers.json");

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const MAX_ITEMS = 20;

const BAD =
  /\b(fall|fell|drop|drops|plung|slump|miss|cuts?|loss|losses|fear|warn|lawsuit|probe|recall|lay.?off|bankrupt|crash|sell.?off|downgrade)\b/i;
const GOOD =
  /\b(surge|soar|jump|rall|beat|record|gain|gains|deal|win|wins|upgrade|boost|strong|highs?|rebound)\b/i;

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

function catalogTickers() {
  const set = new Set();
  try {
    const stocks = JSON.parse(readFileSync(STOCKS, "utf8"));
    for (const s of stocks) if (s.ticker) set.add(String(s.ticker).toUpperCase());
  } catch {
    /* optional */
  }
  try {
    const famous = JSON.parse(readFileSync(FAMOUS, "utf8"));
    for (const s of famous.symbols || []) set.add(String(s).toUpperCase());
  } catch {
    /* optional */
  }
  try {
    const house = JSON.parse(readFileSync(SNIPERS, "utf8"));
    for (const h of house.holdings || [])
      if (h.ticker) set.add(String(h.ticker).toUpperCase());
  } catch {
    /* optional */
  }
  return [...set];
}

/** Collapse whitespace; never mid-cut with … — list shows the full sentence. */
function oneLine(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Details for the tap popup — keep readable length, prefer sentence end. */
function detailLine(text, max = 480) {
  const t = oneLine(text);
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (lastStop > 120) return slice.slice(0, lastStop + 1).trim();
  return `${slice.trimEnd()}…`;
}

function sentimentFrom(title, text) {
  const blob = `${title} ${text}`;
  const bad = BAD.test(blob);
  const good = GOOD.test(blob);
  if (bad && !good) return "bad";
  if (good && !bad) return "good";
  if (bad && good) return BAD.test(title) ? "bad" : "good";
  return "good";
}

function sourceName(url, site) {
  if (site && String(site).trim()) return String(site).trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Market news";
  }
}

async function fetchFmpNews(key, tickers) {
  // Pull a few ticker-scoped batches + a broad feed so we get sector coverage.
  const batches = [];
  const chunkSize = 12;
  for (let i = 0; i < Math.min(tickers.length, 48); i += chunkSize) {
    batches.push(tickers.slice(i, i + chunkSize));
  }
  batches.push([]); // general stock news

  const rows = [];
  for (const chunk of batches) {
    const params = new URLSearchParams({
      limit: "40",
      apikey: key,
    });
    if (chunk.length) params.set("tickers", chunk.join(","));
    const url = `${FMP_BASE}/stock_news?${params}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `FMP news failed (${res.status})${body ? `: ${body.slice(0, 180)}` : ""}`
      );
    }
    const data = await res.json();
    if (Array.isArray(data)) rows.push(...data);
  }
  return rows;
}

function mapRows(rows, catalog) {
  const catalogSet = new Set(catalog);
  const seen = new Set();
  const items = [];

  for (const row of rows) {
    const title = String(row.title || "").trim();
    const url = String(row.url || "").trim();
    if (!title || !url) continue;
    const key = `${title.toLowerCase()}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sym = String(row.symbol || "")
      .toUpperCase()
      .trim();
    const tickers = sym ? [sym] : [];
    // Prefer stories tied to our universe; keep a few broad ones.
    const inUniverse = tickers.some((t) => catalogSet.has(t));

    const text = String(row.text || row.title || "").trim();
    const published = row.publishedDate
      ? new Date(row.publishedDate).toISOString()
      : new Date().toISOString();

    items.push({
      id: `auto-${Buffer.from(key).toString("base64url").slice(0, 16)}`,
      tickers,
      line: oneLine(title),
      details: detailLine(text || title),
      sentiment: sentimentFrom(title, text),
      source: sourceName(url, row.site),
      sourceUrl: url,
      timestamp: published,
      _inUniverse: inUniverse,
    });
  }

  // Rank: universe first, then newest
  items.sort((a, b) => {
    if (a._inUniverse !== b._inUniverse) return a._inUniverse ? -1 : 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return items.slice(0, MAX_ITEMS).map(({ _inUniverse, ...rest }) => rest);
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error("FMP_API_KEY missing — set env or .env.local");
    process.exit(1);
  }

  const catalog = catalogTickers();
  console.log(`Catalog tickers: ${catalog.length}`);
  const rows = await fetchFmpNews(key, catalog);
  console.log(`FMP rows fetched: ${rows.length}`);
  const news = mapRows(rows, catalog);
  if (news.length < 3) {
    console.error("Too few news items mapped — aborting to avoid wiping feed");
    process.exit(1);
  }

  const payload = JSON.stringify(news, null, 2) + "\n";
  writeFileSync(SEED, payload, "utf8");
  mkdirSync(path.dirname(RUNTIME), { recursive: true });
  writeFileSync(RUNTIME, payload, "utf8");
  console.log(`Wrote ${news.length} headlines → data/news.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
