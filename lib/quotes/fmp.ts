/**
 * Financial Modeling Prep quote helpers (server-only).
 * Requires FMP_API_KEY in the environment.
 */

export type Quote = {
  symbol: string;
  price: number;
  name?: string;
};

export type HistClose = {
  date: string; // YYYY-MM-DD
  close: number;
};

export type PerfRange = "1W" | "1M" | "ALL";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

function apiKey(): string {
  return (process.env.FMP_API_KEY || "").trim();
}

function timeseriesDays(range: PerfRange): number {
  if (range === "1W") return 8;
  if (range === "1M") return 32;
  return 1300; // ~5y for all-time since entry
}

/** Batch quote fetch — FMP accepts comma-separated symbols on /quote/. */
export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, Quote>> {
  const key = apiKey();
  const cleaned = [
    ...new Set(
      symbols
        .map((s) => String(s || "").toUpperCase().trim())
        .filter(Boolean)
    ),
  ];
  if (!key || cleaned.length === 0) return {};

  const out: Record<string, Quote> = {};
  const chunkSize = 50;
  for (let i = 0; i < cleaned.length; i += chunkSize) {
    const chunk = cleaned.slice(i, i + chunkSize);
    const url = `${FMP_BASE}/quote/${chunk.map(encodeURIComponent).join(",")}?apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `FMP quote failed (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`
      );
    }
    const data = (await res.json()) as Array<{
      symbol?: string;
      price?: number;
      name?: string;
    }>;
    if (!Array.isArray(data)) continue;
    for (const row of data) {
      const sym = String(row.symbol || "").toUpperCase();
      const price = Number(row.price);
      if (!sym || !Number.isFinite(price) || price <= 0) continue;
      out[sym] = {
        symbol: sym,
        price,
        name: row.name ? String(row.name) : undefined,
      };
    }
  }
  return out;
}

async function fetchOneHistory(
  symbol: string,
  range: PerfRange,
  key: string
): Promise<HistClose[]> {
  const n = timeseriesDays(range);
  const url = `${FMP_BASE}/historical-price-full/${encodeURIComponent(symbol)}?timeseries=${n}&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    historical?: Array<{ date?: string; close?: number; adjClose?: number }>;
  };
  const hist = Array.isArray(data?.historical) ? data.historical : [];
  const points: HistClose[] = [];
  for (const row of hist) {
    const date = String(row.date || "").slice(0, 10);
    const close = Number(row.adjClose ?? row.close);
    if (!date || !Number.isFinite(close) || close <= 0) continue;
    points.push({ date, close });
  }
  // FMP returns newest-first — chronological ascending for charts.
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/** Daily closes for each symbol over 1W / 1M / ALL (FMP historical). */
export async function fetchHistoricalCloses(
  symbols: string[],
  range: PerfRange
): Promise<Record<string, HistClose[]>> {
  const key = apiKey();
  const cleaned = [
    ...new Set(
      symbols
        .map((s) => String(s || "").toUpperCase().trim())
        .filter(Boolean)
    ),
  ].slice(0, 24);
  if (!key || cleaned.length === 0) return {};

  const out: Record<string, HistClose[]> = {};
  const concurrency = 4;
  for (let i = 0; i < cleaned.length; i += concurrency) {
    const batch = cleaned.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (sym) => {
        try {
          return [sym, await fetchOneHistory(sym, range, key)] as const;
        } catch {
          return [sym, [] as HistClose[]] as const;
        }
      })
    );
    for (const [sym, pts] of results) {
      if (pts.length) out[sym] = pts;
    }
  }
  return out;
}
