import type { Levels } from "@/lib/types";

export function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(n: number, withSign = true): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/**
 * Reward-to-risk from planned levels at entry:
 * R2R = (take profit − entry) / (entry − stop loss).
 */
export function r2rFromLevels(levels: Levels | undefined | null): number | null {
  if (!levels) return null;
  const { ep, tp, sl } = levels;
  if (![ep, tp, sl].every((n) => typeof n === "number" && Number.isFinite(n))) {
    return null;
  }
  const reward = tp - ep;
  const risk = ep - sl;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

/** Display like "2.4R" (reward units per 1R risk from entry). */
export function formatR2r(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${ratio.toFixed(1)}R`;
}

/** Replace planned EP with the user's actual fill while keeping TP/SL. */
export function levelsWithUserEntry(
  levels: Levels | undefined | null,
  userEntry: number | null | undefined
): Levels | null {
  if (!levels) return null;
  if (userEntry == null || !Number.isFinite(userEntry) || userEntry <= 0) {
    return levels;
  }
  return { ...levels, ep: Number(userEntry) };
}

/**
 * Hypothetical % move from entry if take-profit or stop-loss is hit.
 * `lossPct` is a positive magnitude (display with a minus sign).
 */
export function hypoPlFromLevels(
  levels: Levels | undefined | null
): { profitPct: number; lossPct: number } | null {
  if (!levels) return null;
  const { ep, tp, sl } = levels;
  if (![ep, tp, sl].every((n) => typeof n === "number" && Number.isFinite(n))) {
    return null;
  }
  if (ep <= 0) return null;
  const profitPct = ((tp - ep) / ep) * 100;
  const lossPct = ((ep - sl) / ep) * 100;
  if (profitPct <= 0 || lossPct <= 0) return null;
  return { profitPct, lossPct };
}

/**
 * Weight-compounded portfolio upside / downside if every name hits its
 * target or stop. Missing weights share leftover equally (or equal-weight all).
 */
export function portfolioHypoPl(
  items: { levels: Levels | null | undefined; weightPct?: number }[]
): { upsidePct: number; downsidePct: number } | null {
  const usable: { profitPct: number; lossPct: number; weightPct?: number }[] =
    [];
  for (const item of items) {
    const pl = hypoPlFromLevels(item.levels);
    if (!pl) continue;
    usable.push({ ...pl, weightPct: item.weightPct });
  }
  if (!usable.length) return null;

  const explicit = usable.map((u) =>
    u.weightPct != null && Number.isFinite(u.weightPct) && u.weightPct > 0
      ? u.weightPct
      : null
  );
  const knownSum = explicit.reduce<number>((a, w) => a + (w ?? 0), 0);
  const missing = explicit.filter((w) => w == null).length;
  const weights = explicit.map((w) => {
    if (w != null) return w;
    if (missing === usable.length) return 1;
    return Math.max(0, 100 - knownSum) / missing;
  });
  const wSum = weights.reduce((a, w) => a + w, 0) || 1;

  let upside = 0;
  let downside = 0;
  usable.forEach((u, i) => {
    const w = weights[i] / wSum;
    upside += w * u.profitPct;
    downside += w * u.lossPct;
  });
  return {
    upsidePct: Number(upside.toFixed(1)),
    downsidePct: Number(downside.toFixed(1)),
  };
}

/**
 * Plain-language risk level derived from beta, for people with no market
 * experience. Low = calmer, High = swings more.
 */
export function riskLevel(beta: number): "Low" | "Medium" | "High" {
  if (beta < 0.8) return "Low";
  if (beta <= 1.2) return "Medium";
  return "High";
}

export function riskColorClass(beta: number): string {
  const level = riskLevel(beta);
  if (level === "Low") return "text-terminal-good";
  if (level === "Medium") return "text-terminal-accent";
  return "text-terminal-bad";
}

// Beginner-friendly names for the trade levels (EP / TP / SL).
export const LEVEL_LABELS = {
  ep: "Buy around",
  tp: "Sell target",
  sl: "Safety exit",
} as const;

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
