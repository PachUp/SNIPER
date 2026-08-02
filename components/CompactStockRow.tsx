"use client";

import type { ReactNode } from "react";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";

type Props = {
  ticker: string;
  name?: string;
  sinceEntry?: number | null;
  weightPct?: number | null;
  badge?: string;
  trailing?: ReactNode;
  onClick: () => void;
  className?: string;
};

/** Dense one-line holding row — tap for thesis + levels. */
export default function CompactStockRow({
  ticker,
  name,
  sinceEntry = null,
  weightPct,
  badge,
  trailing,
  onClick,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md border border-terminal-border/70 bg-terminal-bg px-2 py-1.5 text-left transition-colors hover:border-terminal-accent/45 hover:bg-black/80 ${className}`}
    >
      <TickerLogo symbol={ticker} size={22} priority />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[12px] font-bold tracking-wide text-white">
            {ticker}
          </span>
          {name ? (
            <span className="truncate text-[10px] text-white/45">{name}</span>
          ) : null}
        </span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded px-1 py-0.5 text-[8px] uppercase tracking-wider text-white/50">
          {badge}
        </span>
      ) : null}
      <SinceEntryBadge value={sinceEntry} variant="compact" showEmpty={false} />
      {weightPct != null && Number.isFinite(weightPct) ? (
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-terminal-accent">
          {weightPct.toFixed(weightPct >= 10 ? 0 : 1)}%
        </span>
      ) : null}
      {trailing}
    </button>
  );
}
