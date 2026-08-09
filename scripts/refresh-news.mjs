#!/usr/bin/env node
/**
 * Refresh data/news.json from Financial Modeling Prep stock news.
 * Pulls the newest stories per catalog ticker (max 2 each) so every
 * holding can show recent, directly linked headlines.
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
/** Newest stories kept per ticker in the seed file. */
const PER_TICKER = 2;
/** Fetch a few extras per ticker in case of dups / thin text. */
const FETCH_LIMIT = 6;
const CONCURRENCY = 6;

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

async function fetchTickerNews(key, ticker) {
  const params = new URLSearchParams({
    tickers: ticker,
    limit: String(FETCH_LIMIT),
    apikey: key,
  });
  const url = `${FMP_BASE}/stock_news?${params}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `FMP news ${ticker} failed (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`
    );
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return out;
}

async function fetchFmpNews(key, tickers) {
  const batches = await mapPool(tickers, CONCURRENCY, async (ticker) => {
    try {
      const rows = await fetchTickerNews(key, ticker);
      return { ticker, rows };
    } catch (err) {
      console.warn(`Skip ${ticker}: ${err.message || err}`);
      return { ticker, rows: [] };
    }
  });
  return batches;
}

function mapTickerRows(ticker, rows, seen) {
  const items = [];
  for (const row of rows) {
    const title = String(row.title || "").trim();
    const url = String(row.url || "").trim();
    if (!title || !url) continue;
    const dedupe = `${title.toLowerCase()}|${url}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    // Prefer FMP symbol; fall back to the requested ticker so attribution sticks.
    const sym = String(row.symbol || ticker)
      .toUpperCase()
      .trim();
    const tickers = sym ? [sym] : [ticker];

    const text = String(row.text || row.title || "").trim();
    const published = row.publishedDate
      ? new Date(row.publishedDate).toISOString()
      : new Date().toISOString();

    items.push({
      id: `auto-${Buffer.from(dedupe).toString("base64url").slice(0, 16)}`,
      tickers,
      line: oneLine(title),
      details: detailLine(text || title),
      sentiment: sentimentFrom(title, text),
      source: sourceName(url, row.site),
      sourceUrl: url,
      timestamp: published,
    });
  }

  items.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  return items.slice(0, PER_TICKER);
}

function buildFeed(tickerBatches) {
  const seen = new Set();
  const byId = new Map();

  for (const { ticker, rows } of tickerBatches) {
    const picked = mapTickerRows(ticker, rows, seen);
    for (const item of picked) {
      // Ensure this holding ticker is on the story even if FMP tagged a peer.
      const t = ticker.toUpperCase();
      if (!item.tickers.map((x) => x.toUpperCase()).includes(t)) {
        item.tickers = [...item.tickers, t];
      }
      const existing = byId.get(item.id);
      if (existing) {
        for (const sym of item.tickers) {
          const u = sym.toUpperCase();
          if (!existing.tickers.map((x) => x.toUpperCase()).includes(u)) {
            existing.tickers.push(u);
          }
        }
        continue;
      }
      byId.set(item.id, item);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error("FMP_API_KEY missing — set env or .env.local");
    process.exit(1);
  }

  const catalog = catalogTickers();
  console.log(`Catalog tickers: ${catalog.length} (max ${PER_TICKER} stories each)`);
  const batches = await fetchFmpNews(key, catalog);
  const fetched = batches.reduce((n, b) => n + b.rows.length, 0);
  console.log(`FMP rows fetched: ${fetched}`);
  const news = buildFeed(batches);
  if (news.length < 3) {
    console.error("Too few news items mapped — aborting to avoid wiping feed");
    process.exit(1);
  }

  const payload = JSON.stringify(news, null, 2) + "\n";
  writeFileSync(SEED, payload, "utf8");
  mkdirSync(path.dirname(RUNTIME), { recursive: true });
  writeFileSync(RUNTIME, payload, "utf8");

  const covered = new Set();
  for (const item of news) {
    for (const t of item.tickers) covered.add(t.toUpperCase());
  }
  console.log(
    `Wrote ${news.length} headlines covering ${covered.size} tickers → data/news.json`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
