"use client";

import { useMemo } from "react";
type RiskHolding = {
  ticker: string;
  name?: string;
  sector?: string;
  weightPct?: number;
};

type Row = {
  sector: string;
  weightPct: number;
};

function sectorWeights(holdings: RiskHolding[]): Row[] {
  const n = holdings.length || 1;
  const map = new Map<string, number>();
  for (const h of holdings) {
    const sector = String(h.sector || "Other");
    const w =
      typeof h.weightPct === "number" && Number.isFinite(h.weightPct)
        ? h.weightPct
        : 100 / n;
    map.set(sector, (map.get(sector) || 0) + w);
  }
  return [...map.entries()]
    .map(([sector, weightPct]) => ({ sector, weightPct }))
    .sort((a, b) => b.weightPct - a.weightPct);
}

/** Example Dashboard layer: concentration + simple stress (additive). */
export default function PortfolioRiskPanel({
  holdings,
  example,
}: {
  holdings: RiskHolding[];
  /** When true, show preview chrome for empty/demo state */
  example?: boolean;
}) {
  const rows = useMemo(() => sectorWeights(holdings), [holdings]);
  const top = rows[0];
  const topWeight = top?.weightPct ?? 0;
  const equalShock = holdings.length
    ? (100 / holdings.length) * 0.2
    : 0;

  if (!holdings.length && !example) return null;

  const displayRows =
    rows.length > 0
      ? rows.slice(0, 5)
      : [
          { sector: "Information Technology", weightPct: 42 },
          { sector: "Health Care", weightPct: 18 },
          { sector: "Financials", weightPct: 16 },
          { sector: "Consumer Discretionary", weightPct: 14 },
          { sector: "Energy", weightPct: 10 },
        ];

  const displayTop = displayRows[0];
  const shock = holdings.length ? equalShock : 3.5;

  return (
    <section className="animate-fadeIn rounded-xl border border-terminal-border bg-terminal-panel p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terminal-accent">
            {example ? "Example preview · risk shape" : "Risk shape"}
          </p>
          <h3 className="mt-1 text-sm font-semibold tracking-wide text-white">
            How concentrated is this book?
          </h3>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-terminal-muted">
        {displayTop
          ? `${displayTop.sector} is about ${displayTop.weightPct.toFixed(0)}% of the portfolio.`
          : "Sector mix appears after you build."}{" "}
        If one average-sized name fell about 20%, the book would move roughly{" "}
        <span className="text-white/90">−{shock.toFixed(1)}%</span> (equal-weight
        sketch — not advice).
      </p>

      <div className="mt-4 space-y-2">
        {displayRows.map((r) => (
          <div key={r.sector}>
            <div className="mb-1 flex justify-between text-[10px] tracking-wide">
              <span className="truncate text-white/80">{r.sector}</span>
              <span className="text-terminal-muted">
                {r.weightPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-terminal-accent/80"
                style={{
                  width: `${Math.min(100, Math.max(4, r.weightPct))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {topWeight >= 40 ? (
        <p className="mt-3 text-[11px] text-terminal-accent">
          Heads-up: one sector is over ~40%. In a full product this would suggest
          rebalancing — still your call.
        </p>
      ) : null}
    </section>
  );
}
