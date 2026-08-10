#!/usr/bin/env node
/**
 * Refresh data/news.json from Financial Modeling Prep stock news.
 * Picks the newest useful stories per ticker (max 2).
 * List title = what happened + likely effect on the stock (beginner-clear).
 *
 * Env:
 *   FMP_API_KEY  (required)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  presentStory,
  storyQuality,
  isClickbait,
  canExplainEffect,
} from "./plainNews.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SEED = path.join(ROOT, "data", "news.json");
const RUNTIME = path.join(ROOT, "data", ".runtime", "news.json");
const STOCKS = path.join(ROOT, "data", "stocks.json");
const FAMOUS = path.join(ROOT, "data", "famous_stocks.json");
const SNIPERS = path.join(ROOT, "data", "snipers.json");

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
/** Newest / best stories kept per ticker in the seed file. */
const PER_TICKER = 2;
/** Pull extras so we can skip clickbait and still fill 2 slots. */
const FETCH_LIMIT = 20;
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

function prettyName(ticker, name, business) {
  const t = String(ticker || "").toUpperCase();
  const n = cleanName(name);
  const biz = String(business || "").trim();
  const fromBiz = biz.match(
    /^([A-Z][\w&'.]*(?:\s+[A-Z][\w&'.]*){0,3})\s+(?:makes|is|provides|builds|operates|offers|delivers|runs)/
  );
  const bizName = fromBiz ? fromBiz[1] : "";
  // Prefer real company name over ticker-as-name or industry-label names
  if (bizName && (!n || n.toUpperCase() === t || /services$/i.test(n))) {
    return bizName;
  }
  if (n && n.toUpperCase() !== t) return n;
  if (bizName) return bizName;
  return n || t;
}

function cleanName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim();
}

function companyNames() {
  const map = new Map();
  try {
    const stocks = JSON.parse(readFileSync(STOCKS, "utf8"));
    for (const s of stocks) {
      if (!s.ticker) continue;
      const t = String(s.ticker).toUpperCase();
      map.set(t, prettyName(t, s.name, s.business));
    }
  } catch {
    /* optional */
  }
  try {
    const house = JSON.parse(readFileSync(SNIPERS, "utf8"));
    for (const h of house.holdings || []) {
      if (!h.ticker) continue;
      const t = String(h.ticker).toUpperCase();
      const pretty = prettyName(t, h.name, h.business);
      if (!map.has(t) || map.get(t) === t) map.set(t, pretty);
    }
  } catch {
    /* optional */
  }
  return map;
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
  return mapPool(tickers, CONCURRENCY, async (ticker) => {
    try {
      const rows = await fetchTickerNews(key, ticker);
      return { ticker, rows };
    } catch (err) {
      console.warn(`Skip ${ticker}: ${err.message || err}`);
      return { ticker, rows: [] };
    }
  });
}

function mapTickerRows(ticker, rows, seen, names) {
  const name = names.get(ticker) || ticker;
  const scored = [];

  for (const row of rows) {
    const title = String(row.title || "").trim();
    const url = String(row.url || "").trim();
    if (!title || !url) continue;
    const dedupe = `${title.toLowerCase()}|${url}`;
    if (seen.has(dedupe)) continue;

    const text = String(row.text || row.title || "").trim();
    const published = row.publishedDate
      ? new Date(row.publishedDate).toISOString()
      : new Date().toISOString();

    if (!canExplainEffect(title, text, name, ticker)) continue;
    const quality = storyQuality(title, text, published, name, ticker);
    scored.push({ title, url, text, published, dedupe, quality });
  }

  scored.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return new Date(b.published) - new Date(a.published);
  });

  const preferred = scored.filter((r) => !isClickbait(r.title));
  const ordered = preferred.length >= 1 ? preferred : scored;

  const items = [];
  for (const row of ordered) {
    if (items.length >= PER_TICKER) break;
    const presented = presentStory({
      ticker,
      name,
      title: row.title,
      text: row.text,
    });
    if (
      presented.skip ||
      !presented.line ||
      isClickbait(presented.line) ||
      /\?$/.test(presented.line.trim()) ||
      !/—/.test(presented.line)
    ) {
      continue;
    }
    const sentiment =
      presented.sentiment === "bad" || presented.sentiment === "good"
        ? presented.sentiment
        : sentimentFrom(row.title, row.text);
    seen.add(row.dedupe);
    items.push({
      id: `auto-${Buffer.from(row.dedupe).toString("base64url").slice(0, 16)}`,
      tickers: [ticker],
      line: presented.line,
      details: presented.details,
      sentiment,
      source: sourceName(row.url, null),
      sourceUrl: row.url,
      timestamp: row.published,
    });
  }

  return items;
}

function buildFeed(tickerBatches, names) {
  const seen = new Set();
  const byId = new Map();

  for (const { ticker, rows } of tickerBatches) {
    const picked = mapTickerRows(ticker.toUpperCase(), rows, seen, names);
    for (const item of picked) {
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
  const names = companyNames();
  console.log(
    `Catalog tickers: ${catalog.length} (max ${PER_TICKER} plain-English stories each)`
  );
  const batches = await fetchFmpNews(key, catalog);
  const fetched = batches.reduce((n, b) => n + b.rows.length, 0);
  console.log(`FMP rows fetched: ${fetched}`);
  const news = buildFeed(batches, names);
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
  console.log("Sample:", news[0]?.line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
