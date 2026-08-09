"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useI18n } from "@/components/LanguageProvider";

export type WeightSlice = {
  ticker: string;
  sector: string;
  industry?: string;
  weightPct: number;
};

const SECTOR_COLORS = [
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#f43f5e",
  "#eab308",
  "#14b8a6",
  "#fb7185",
  "#818cf8",
  "#94a3b8",
];

type SectorRow = {
  sector: string;
  weight: number;
  color: string;
  industries: { industry: string; weight: number; tickers: string[] }[];
};

function normalizeWeights(rows: WeightSlice[]): WeightSlice[] {
  if (!rows.length) return [];
  const has = rows.some((r) => Number.isFinite(r.weightPct) && r.weightPct > 0);
  if (!has) {
    const even = 100 / rows.length;
    return rows.map((r) => ({ ...r, weightPct: even }));
  }
  const sum = rows.reduce(
    (a, r) => a + (Number.isFinite(r.weightPct) && r.weightPct > 0 ? r.weightPct : 0),
    0
  );
  if (sum <= 0) return rows;
  // Rebase to 100 if weights don't already sum cleanly
  if (Math.abs(sum - 100) > 0.5) {
    return rows.map((r) => ({
      ...r,
      weightPct:
        ((Number.isFinite(r.weightPct) && r.weightPct > 0 ? r.weightPct : 0) /
          sum) *
        100,
    }));
  }
  return rows;
}

export default function PortfolioWeightPie({
  holdings,
  title,
  hint,
  empty,
}: {
  holdings: WeightSlice[];
  title?: string;
  hint?: string;
  empty?: string;
}) {
  const { t } = useI18n();
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const heading = title ?? t("dash.allocTitle");
  const sub = hint ?? t("dash.allocHint");
  const emptyMsg = empty ?? t("dash.allocEmpty");

  const sectors = useMemo<SectorRow[]>(() => {
    const norm = normalizeWeights(holdings);
    const bySector = new Map<
      string,
      {
        weight: number;
        industries: Map<string, { weight: number; tickers: string[] }>;
      }
    >();

    for (const h of norm) {
      const sector = (h.sector || "Other").trim() || "Other";
      const industry = (h.industry || "General").trim() || "General";
      let bucket = bySector.get(sector);
      if (!bucket) {
        bucket = { weight: 0, industries: new Map() };
        bySector.set(sector, bucket);
      }
      bucket.weight += h.weightPct;
      const ind = bucket.industries.get(industry) ?? {
        weight: 0,
        tickers: [],
      };
      ind.weight += h.weightPct;
      if (!ind.tickers.includes(h.ticker)) ind.tickers.push(h.ticker);
      bucket.industries.set(industry, ind);
    }

    return [...bySector.entries()]
      .map(([sector, data], i) => ({
        sector,
        weight: Number(data.weight.toFixed(1)),
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        industries: [...data.industries.entries()]
          .map(([industry, d]) => ({
            industry,
            weight: Number(d.weight.toFixed(1)),
            tickers: d.tickers,
          }))
          .sort((a, b) => b.weight - a.weight),
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [holdings]);

  const pieData = sectors.map((s) => ({
    name: s.sector,
    value: s.weight,
    color: s.color,
  }));

  const focus =
    sectors.find((s) => s.sector === activeSector) ?? sectors[0] ?? null;

  if (!sectors.length) {
    return (
      <div className="rounded-xl border border-terminal-border bg-terminal-panel p-4 text-sm text-terminal-muted">
        {emptyMsg}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-terminal-border bg-terminal-panel p-3 sm:p-4">
      <div className="mb-2 text-[10px] tracking-[0.2em] text-terminal-muted">
        {heading}
      </div>
      <p className="mb-3 text-[11px] text-terminal-muted">{sub}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={84}
                paddingAngle={2}
                stroke="#111111"
                strokeWidth={1}
                onClick={(_, idx) => {
                  const row = pieData[idx];
                  if (row) setActiveSector(row.name);
                }}
              >
                {pieData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    opacity={
                      !activeSector || activeSector === d.name ? 1 : 0.35
                    }
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#111111",
                  border: "1px solid #222222",
                  borderRadius: 8,
                  color: "#f5f5f5",
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [
                  `${Number(v).toFixed(1)}%`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex max-h-[240px] flex-col gap-2 overflow-y-auto pr-1">
          {sectors.map((s) => {
            const open = focus?.sector === s.sector;
            return (
              <button
                key={s.sector}
                type="button"
                onClick={() =>
                  setActiveSector((cur) =>
                    cur === s.sector ? null : s.sector
                  )
                }
                className={`rounded-lg border px-2.5 py-2 text-left transition ${
                  open
                    ? "border-terminal-accent/50 bg-terminal-accent/10"
                    : "border-terminal-border bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="truncate text-[13px] font-semibold text-white">
                      {s.sector}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-terminal-accent">
                    {s.weight}%
                  </span>
                </div>
                {open ? (
                  <ul className="mt-1.5 space-y-1 border-t border-white/10 pt-1.5">
                    {s.industries.map((ind) => (
                      <li
                        key={`${s.sector}-${ind.industry}`}
                        className="flex items-start justify-between gap-2 text-[12px]"
                      >
                        <span className="min-w-0 text-white/75">
                          <span className="text-white/90">{ind.industry}</span>
                          <span className="mt-0.5 block text-[10px] text-terminal-muted">
                            {ind.tickers.join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-white/70">
                          {ind.weight}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 truncate text-[10px] text-terminal-muted">
                    {s.industries.map((i) => i.industry).join(" · ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
