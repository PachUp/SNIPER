#!/usr/bin/env node
/**
 * Fingerprint catalog desk levels (EP/TP/SL + upside) for deploy verification.
 * Usage:
 *   node scripts/catalog-fingerprint.mjs                 # local data/stocks.json
 *   node scripts/catalog-fingerprint.mjs --url URL       # remote /api/stocks
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SEED = path.join(ROOT, "data", "stocks.json");

function fingerprint(stocks) {
  const rows = (Array.isArray(stocks) ? stocks : [])
    .map((s) => {
      const t = String(s.ticker || "").toUpperCase();
      const lv = s.levels || {};
      return `${t}|${lv.ep}|${lv.tp}|${lv.sl}|${s.upsidePct}`;
    })
    .filter((r) => r.includes("|"))
    .sort();
  const raw = rows.join("\n");
  return {
    count: rows.length,
    sha: createHash("sha256").update(raw).digest("hex").slice(0, 16),
    sample: rows.slice(0, 3),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf("--url");
  let stocks;
  if (urlIdx >= 0) {
    const url = args[urlIdx + 1];
    if (!url) {
      console.error("Missing URL after --url");
      process.exit(1);
    }
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`Fetch failed ${res.status}`);
      process.exit(1);
    }
    const data = await res.json();
    stocks = Array.isArray(data) ? data : data.stocks || [];
  } else {
    if (!existsSync(SEED)) {
      console.error(`Missing ${SEED}`);
      process.exit(1);
    }
    stocks = JSON.parse(readFileSync(SEED, "utf8"));
  }
  const fp = fingerprint(stocks);
  process.stdout.write(`${fp.sha} ${fp.count}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
