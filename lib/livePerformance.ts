import type { PerfPoint } from "@/lib/types";

export type PerfRange = "1W" | "1M" | "ALL";

export type LivePosition = {
  ticker: string;
  /** Actual entry / fill price. */
  entry: number;
  /** Portfolio weight % (optional — equal-weight if missing). */
  weightPct?: number;
  /** Live last price from FMP. */
  live: number;
};

export type EntryPosition = {
  ticker: string;
  entry: number;
  weightPct?: number;
  /**
   * YYYY-MM-DD — only count this name on/after this day
   * (when the user set their fill). Omit for already-running house book.
   */
  since?: string;
};

/**
 * Single-name return since THAT stock’s entry (the go-to formula):
 * (live − entry) / entry × 100
 */
export function returnSinceEntryPct(
  entry: number,
  live: number
): number | null {
  if (
    !Number.isFinite(entry) ||
    entry <= 0 ||
    !Number.isFinite(live) ||
    live <= 0
  ) {
    return null;
  }
  return Number((((live - entry) / entry) * 100).toFixed(2));
}

/**
 * Portfolio % = simple average of each stock’s return-since-entry.
 * Only stocks with both an entry and a live quote are included.
 * New user with no entries → 0.
 */
export function livePortfolioReturnPct(positions: LivePosition[]): number {
  const rets: number[] = [];
  for (const p of positions) {
    const ret = returnSinceEntryPct(p.entry, p.live);
    if (ret == null) continue;
    rets.push(ret);
  }
  if (rets.length === 0) return 0;
  const sum = rets.reduce((a, r) => a + r, 0);
  return Number((sum / rets.length).toFixed(2));
}

function formatLabel(date: string, range: PerfRange): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  if (range === "ALL") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * 1W / 1M — window move ÷ entry from start of that window.
 * ALL — (close − entry) / entry  (true all-time since entry).
 */
export function historicalRangeSeries(
  positions: EntryPosition[],
  history: Record<string, { date: string; close: number }[]>,
  range: PerfRange
): { series: PerfPoint[]; rangePct: number } {
  const active = positions.filter(
    (p) => Number.isFinite(p.entry) && p.entry > 0
  );
  if (active.length === 0) {
    return { series: [{ t: "—", pct: 0 }], rangePct: 0 };
  }

  const allTime = range === "ALL";

  const bySym = new Map<string, { date: string; close: number }[]>();
  for (const p of active) {
    const sym = p.ticker.toUpperCase();
    let rows = [...(history[sym] || [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    if (p.since) rows = rows.filter((r) => r.date >= p.since!);
    if (rows.length >= 1) bySym.set(sym, rows);
  }
  if (bySym.size === 0) {
    return { series: [{ t: "—", pct: 0 }], rangePct: 0 };
  }

  const dateSet = new Set<string>();
  for (const rows of bySym.values()) {
    for (const r of rows) dateSet.add(r.date);
  }
  const dates = [...dateSet].sort();
  if (dates.length === 0) {
    return { series: [{ t: "—", pct: 0 }], rangePct: 0 };
  }

  const startClose = new Map<string, number>();
  for (const [sym, rows] of bySym) {
    startClose.set(sym, rows[0].close);
  }

  const maps = new Map<string, Map<string, number>>();
  for (const [sym, rows] of bySym) {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.date, r.close);
    maps.set(sym, m);
  }
  const lastClose = new Map<string, number>();

  const raw: { date: string; pct: number }[] = [];
  for (const date of dates) {
    for (const p of active) {
      const sym = p.ticker.toUpperCase();
      const c = maps.get(sym)?.get(date);
      if (c != null) lastClose.set(sym, c);
    }
    const dayRets: number[] = [];
    for (const p of active) {
      if (p.since && date < p.since) continue;
      const sym = p.ticker.toUpperCase();
      const px = lastClose.get(sym);
      const start = startClose.get(sym);
      if (px == null || !(p.entry > 0)) continue;
      if (allTime) {
        dayRets.push(((px - p.entry) / p.entry) * 100);
      } else if (start != null) {
        dayRets.push(((px - start) / p.entry) * 100);
      }
    }
    if (dayRets.length === 0) continue;
    raw.push({
      date,
      pct: dayRets.reduce((a, r) => a + r, 0) / dayRets.length,
    });
  }

  if (raw.length === 0) {
    return { series: [{ t: "—", pct: 0 }], rangePct: 0 };
  }

  const rangePct = Number(raw[raw.length - 1].pct.toFixed(2));

  const maxPts = range === "1W" ? 7 : range === "1M" ? 14 : 30;
  const sampled =
    raw.length <= maxPts
      ? raw
      : (() => {
          const out: typeof raw = [];
          const step = (raw.length - 1) / (maxPts - 1);
          for (let i = 0; i < maxPts; i++) {
            out.push(raw[Math.round(i * step)]);
          }
          if (out[out.length - 1]?.date !== raw[raw.length - 1].date) {
            out[out.length - 1] = raw[raw.length - 1];
          }
          return out;
        })();

  const series: PerfPoint[] = sampled.map((p, i) => ({
    t:
      i === 0
        ? range === "ALL"
          ? "ALL"
          : range
        : i === sampled.length - 1
          ? "Now"
          : formatLabel(p.date, range),
    // Window ranges rebase to 0 on day 1; ALL keeps true since-entry %.
    pct: !allTime && i === 0 ? 0 : Number(p.pct.toFixed(2)),
  }));
  if (series.length === 1) {
    series.push({ t: "Now", pct: rangePct });
  } else {
    series[series.length - 1] = {
      ...series[series.length - 1],
      t: "Now",
      pct: rangePct,
    };
  }

  return { series, rangePct };
}

export function historicalEntrySeries(
  positions: EntryPosition[],
  history: Record<string, { date: string; close: number }[]>,
  range: PerfRange
): PerfPoint[] {
  return historicalRangeSeries(positions, history, range).series;
}

export async function fetchLiveQuotesClient(
  symbols: string[]
): Promise<Record<string, number>> {
  const cleaned = [
    ...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean)),
  ];
  if (cleaned.length === 0) return {};
  const res = await fetch(
    `/api/quotes?symbols=${encodeURIComponent(cleaned.join(","))}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as {
    quotes?: Record<string, { price?: number }>;
  };
  const out: Record<string, number> = {};
  for (const [sym, q] of Object.entries(data.quotes ?? {})) {
    const price = Number(q?.price);
    if (Number.isFinite(price) && price > 0) out[sym.toUpperCase()] = price;
  }
  return out;
}

export async function fetchHistoryClient(
  symbols: string[],
  range: PerfRange
): Promise<Record<string, { date: string; close: number }[]>> {
  const cleaned = [
    ...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean)),
  ];
  if (cleaned.length === 0) return {};
  const res = await fetch(
    `/api/quotes/history?symbols=${encodeURIComponent(cleaned.join(","))}&range=${range}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as {
    history?: Record<string, { date: string; close: number }[]>;
  };
  return data.history ?? {};
}
