"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PerfPoint, Stock } from "@/lib/types";
import { buildPerformance } from "@/lib/clientPortfolio";
import { pct } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

type Range = "1W" | "1M" | "1Y";
const RANGES: Range[] = ["1W", "1M", "1Y"];

export default function PerformanceChart({
  holdings,
  series,
  title,
}: {
  holdings?: Stock[];
  series?: Record<Range, PerfPoint[]>;
  title?: string;
}) {
  const { t } = useI18n();
  const [range, setRange] = useState<Range>("1M");
  const heading = title ?? t("perf.default");

  const data = useMemo<PerfPoint[]>(() => {
    if (series) return series[range];
    if (holdings) return buildPerformance(holdings, range);
    return [];
  }, [series, holdings, range]);

  const endPct = data.length ? data[data.length - 1].pct : 0;
  const positive = endPct >= 0;
  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <div className="flex h-full flex-col rounded-xl border border-terminal-border bg-terminal-panel p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs tracking-[0.25em] text-terminal-muted">
            {heading}
          </div>
          <div
            className="mt-1 text-3xl font-bold"
            style={{ color }}
          >
            {pct(endPct)}
          </div>
          <div className="text-[11px] text-terminal-muted">
            {t("perf.since")}
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-2 py-1 text-[11px] ${
                range === r
                  ? "bg-terminal-accent/15 text-terminal-accent"
                  : "text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tick={{ fill: "#7d8799", fontSize: 11 }}
              axisLine={{ stroke: "#1f2733" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#7d8799", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#11161f",
                border: "1px solid #1f2733",
                borderRadius: 8,
                color: "#d6deeb",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, t("perf.return")]}
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
