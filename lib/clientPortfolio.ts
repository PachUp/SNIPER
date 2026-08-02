"use client";

import type {
  BuiltPortfolio,
  PerfPoint,
  PortfolioHolding,
  Stock,
} from "@/lib/types";

const KEY = "sniper.portfolio.v1";
const SWAPS_KEY = "sniper.swaps.v1";

export function loadPortfolio(): BuiltPortfolio | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BuiltPortfolio) : null;
  } catch {
    return null;
  }
}

export function savePortfolio(p: BuiltPortfolio): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearPortfolio(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(SWAPS_KEY);
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(ENTRY_DATES_KEY);
  localStorage.removeItem(REMOVED_KEY);
  localStorage.removeItem(ADDED_KEY);
  localStorage.removeItem(REPLACE_STACK_KEY);
}

const ENTRIES_KEY = "sniper.entries.v1";
const ENTRY_DATES_KEY = "sniper.entryDates.v1";
const REMOVED_KEY = "sniper.removed.v1";
const ADDED_KEY = "sniper.added.v1";
const REPLACE_STACK_KEY = "sniper.replaceStack.v1";

export const MAX_PERSONAL_ADDS = 2;

export type ReplaceRecord = {
  addedTicker: string;
  droppedOriginal?: string;
  droppedCurrent?: string;
};

/** User's actual fill prices keyed by ticker. */
export function loadEntries(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** YYYY-MM-DD when each entry price was set (basis for “since entry” charts). */
export function loadEntryDates(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ENTRY_DATES_KEY);
    const dates = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    // Backfill: legacy fills without a date start “since entry” from today.
    const prices = loadEntries();
    let dirty = false;
    const today = new Date().toISOString().slice(0, 10);
    for (const sym of Object.keys(prices)) {
      if (!dates[sym]) {
        dates[sym] = today;
        dirty = true;
      }
    }
    if (dirty) {
      localStorage.setItem(ENTRY_DATES_KEY, JSON.stringify(dates));
    }
    return dates;
  } catch {
    return {};
  }
}

export function saveEntry(ticker: string, price: number): void {
  if (typeof window === "undefined") return;
  const sym = ticker.toUpperCase();
  const all = loadEntries();
  const dates = loadEntryDates();
  const prev = all[sym];
  all[sym] = price;
  // New fill or first set → restart “since entry” from today.
  if (prev == null || prev !== price || !dates[sym]) {
    dates[sym] = new Date().toISOString().slice(0, 10);
  }
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
  localStorage.setItem(ENTRY_DATES_KEY, JSON.stringify(dates));
}

/** Built holdings auto-dropped when the user adds a personal stock. */
export function loadRemoved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMOVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRemoved(tickers: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMOVED_KEY, JSON.stringify(tickers));
}

export type EliminateCandidate = {
  /** Original portfolio slot ticker (before any switch). */
  originalTicker: string;
  currentTicker: string;
  sector: string;
  industry?: string;
  beta: number;
  weightPct?: number;
};

/**
 * Pick the built holding most similar to the incoming personal stock
 * (same industry/sector preferred, then closest beta).
 */
export function pickStockToEliminate(
  incoming: { sector: string; industry?: string; beta: number },
  candidates: EliminateCandidate[]
): EliminateCandidate | null {
  if (!candidates.length) return null;

  const inIndustry = (incoming.industry || "").trim().toLowerCase();
  const inSector = (incoming.sector || "").trim().toLowerCase();
  const inBeta = Number.isFinite(incoming.beta) ? incoming.beta : 1;

  function score(c: EliminateCandidate): number {
    const cIndustry = (c.industry || "").trim().toLowerCase();
    const cSector = (c.sector || "").trim().toLowerCase();
    let industryScore = 3;
    if (inIndustry && cIndustry && inIndustry === cIndustry) industryScore = 0;
    else if (
      inIndustry &&
      cIndustry &&
      (inIndustry.includes(cIndustry) || cIndustry.includes(inIndustry))
    ) {
      industryScore = 0.4;
    } else if (inSector && cSector && inSector === cSector) {
      industryScore = 1;
    }
    const betaDist = Math.abs(
      inBeta - (Number.isFinite(c.beta) ? c.beta : 1)
    );
    // Industry/sector first, then beta closeness.
    return industryScore * 10 + betaDist;
  }

  return [...candidates].sort((a, b) => score(a) - score(b))[0] ?? null;
}

/** Extra personal holdings the user added (cap 2). */
export function loadAdded(): PortfolioHolding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADDED_KEY);
    return raw ? (JSON.parse(raw) as PortfolioHolding[]) : [];
  } catch {
    return [];
  }
}

export function saveAdded(holdings: PortfolioHolding[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADDED_KEY, JSON.stringify(holdings));
}

/** Records a user's switch from an AI-picked stock to an approved alternative. */
export function loadSwaps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SWAPS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveSwap(original: string, current: string): void {
  if (typeof window === "undefined") return;
  const swaps = loadSwaps();
  if (current.toUpperCase() === original.toUpperCase()) {
    delete swaps[original];
  } else {
    swaps[original] = current;
  }
  localStorage.setItem(SWAPS_KEY, JSON.stringify(swaps));
}

export function clearSwap(original: string): void {
  if (typeof window === "undefined") return;
  const swaps = loadSwaps();
  delete swaps[original];
  localStorage.setItem(SWAPS_KEY, JSON.stringify(swaps));
}

export function loadReplaceStack(): ReplaceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPLACE_STACK_KEY);
    return raw ? (JSON.parse(raw) as ReplaceRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveReplaceStack(stack: ReplaceRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REPLACE_STACK_KEY, JSON.stringify(stack));
}

export function pushReplace(record: ReplaceRecord): ReplaceRecord[] {
  const next = [...loadReplaceStack(), record];
  saveReplaceStack(next);
  return next;
}

export function popReplace(): ReplaceRecord | null {
  const stack = loadReplaceStack();
  if (!stack.length) return null;
  const last = stack[stack.length - 1];
  saveReplaceStack(stack.slice(0, -1));
  return last;
}

// Deterministic pseudo-random generator so the mock chart is stable per seed.
function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashTickers(tickers: string[]): number {
  return tickers.join("").split("").reduce((acc, c) => acc + c.charCodeAt(0), 7);
}

/**
 * Mock performance series for the user's portfolio, derived from the average
 * upside/beta of its holdings. Replaceable by real time-series from your
 * software later.
 */
export function buildPerformance(
  holdings: Stock[],
  range: "1W" | "1M" | "1Y"
): PerfPoint[] {
  const points = range === "1W" ? 7 : range === "1M" ? 8 : 12;
  const labels =
    range === "1W"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : range === "1M"
      ? ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]
      : [
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
        ];

  const avgUpside =
    holdings.reduce((a, s) => a + s.upsidePct, 0) / (holdings.length || 1);
  const avgBeta =
    holdings.reduce((a, s) => a + s.beta, 0) / (holdings.length || 1);

  // Target end return scales with upside and range length.
  const rangeFactor = range === "1W" ? 0.08 : range === "1M" ? 0.25 : 0.7;
  const target = avgUpside * rangeFactor;
  const rnd = seeded(hashTickers(holdings.map((h) => h.ticker)) + points);

  const out: PerfPoint[] = [];
  let cur = 0;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const drift = target * progress;
    const noise = (rnd() - 0.5) * avgBeta * (range === "1Y" ? 3 : 1.2);
    cur = i === 0 ? 0 : drift + noise;
    out.push({ t: labels[i] ?? `${i}`, pct: Number(cur.toFixed(2)) });
  }
  // Pin the last point near target for a coherent headline number.
  out[out.length - 1] = {
    t: labels[points - 1] ?? `${points - 1}`,
    pct: Number(target.toFixed(2)),
  };
  return out;
}
