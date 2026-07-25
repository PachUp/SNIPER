"use client";

import type { BuiltPortfolio, PerfPoint, Stock } from "@/lib/types";

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
  swaps[original] = current;
  localStorage.setItem(SWAPS_KEY, JSON.stringify(swaps));
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
