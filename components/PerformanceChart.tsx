"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PerfPoint } from "@/lib/types";
import {
  fetchHistoryClient,
  historicalRangeSeries,
  type EntryPosition,
  type PerfRange,
} from "@/lib/livePerformance";
import { pct } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

const RANGES: PerfRange[] = ["1W", "1M", "ALL"];

/**
 * Headline: 1W/1M = window move ÷ entry; ALL = live all-time since entry.
 */
export default function PerformanceChart({
  liveReturnPct = 0,
  positions = [],
  title,
  subtitle,
  loading = false,
  refreshKey = 0,
  compact = false,
}: {
  liveReturnPct?: number;
  positions?: EntryPosition[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  refreshKey?: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [range, setRange] = useState<PerfRange>("ALL");
  const [series, setSeries] = useState<PerfPoint[]>([{ t: "—", pct: 0 }]);
  const [rangePct, setRangePct] = useState(0);
  const [histLoading, setHistLoading] = useState(false);

  const heading = title ?? t("perf.default");
  const hasEntries = positions.some((p) => p.entry > 0);

  const posKey = useMemo(
    () =>
      positions
        .map((p) => `${p.ticker.toUpperCase()}:${p.entry}:${p.since ?? ""}`)
        .sort()
        .join("|"),
    [positions]
  );

  useEffect(() => {
    const active = positions.filter(
      (p) => Number.isFinite(p.entry) && p.entry > 0
    );
    if (active.length === 0) {
      setSeries([{ t: "—", pct: 0 }]);
      setRangePct(0);
      return;
    }
    let cancelled = false;
    setHistLoading(true);
    fetchHistoryClient(
      active.map((p) => p.ticker),
      range
    )
      .then((history) => {
        if (cancelled) return;
        const { series: built, rangePct: rp } = historicalRangeSeries(
          active,
          history,
          range
        );
        setSeries(built);
        setRangePct(rp);
      })
      .catch(() => {
        if (!cancelled) {
          setSeries([{ t: "—", pct: 0 }]);
          setRangePct(0);
        }
      })
      .finally(() => {
        if (!cancelled) setHistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [posKey, range, positions, refreshKey]);

  const data = series;
  const endPct =
    range === "ALL" && Number.isFinite(liveReturnPct)
      ? liveReturnPct
      : rangePct;
  const positive = endPct >= 0;
  const color = positive ? "#22c55e" : "#ef4444";
  const busy = loading || histLoading;

  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-xl border border-terminal-border bg-terminal-panel ${
        compact ? "p-2.5" : "p-4"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.22em] text-terminal-muted">
            {heading}
          </div>
          <div
            className={`mt-0.5 font-bold tabular-nums ${compact ? "text-2xl" : "text-3xl"}`}
            style={{ color }}
          >
            {busy ? "…" : pct(endPct)}
          </div>
          <div className="truncate text-[10px] text-terminal-muted">
            {hasEntries
              ? range === "ALL"
                ? t("perf.allVsEntry")
                : t("perf.rangeVsEntry", { range })
              : subtitle ?? t("perf.sinceEntryEmpty")}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-1.5 py-1 text-[10px] font-medium ${
                range === r
                  ? "bg-terminal-accent/15 text-terminal-accent"
                  : "text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {r === "ALL" ? t("perf.all") : r}
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 flex-1 ${compact ? "mt-1.5" : "mt-3"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 2, left: -28, bottom: 0 }}
          >
            <defs>
              <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tick={{ fill: "#8a8a8a", fontSize: 10 }}
              axisLine={{ stroke: "#222222" }}
              tickLine={false}
              interval="preserveStartEnd"
              height={18}
            />
            <YAxis
              tick={{ fill: "#8a8a8a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#111111",
                border: "1px solid #222222",
                borderRadius: 8,
                color: "#f5f5f5",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, t("perf.vsEntry")]}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke={color}
              strokeWidth={2}
              fill="url(#perfFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
