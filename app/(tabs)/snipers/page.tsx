"use client";

import { useEffect, useState } from "react";
import type { HousePortfolio } from "@/lib/types";
import { money } from "@/lib/format";
import PerformanceChart from "@/components/PerformanceChart";
import { useI18n } from "@/components/LanguageProvider";

export default function SnipersPage() {
  const { t } = useI18n();
  const [house, setHouse] = useState<HousePortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/snipers")
      .then((r) => r.json())
      .then((d: HousePortfolio) => setHouse(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-terminal-muted">
        {t("common.loading")}
      </div>
    );
  }
  if (!house) {
    return (
      <div className="py-16 text-center text-terminal-muted">
        {t("snipers.noHouse")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-wide">{house.name}</h1>
        <p className="text-xs text-terminal-muted">
          {t("snipers.subtitle", {
            date: new Date(house.updated).toLocaleDateString(),
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PerformanceChart
          series={house.performance}
          title={t("perf.house")}
        />

        <div className="rounded-xl border border-terminal-border bg-terminal-panel p-4">
          <div className="mb-3 text-xs tracking-[0.25em] text-terminal-muted">
            {t("snipers.holdings")}
          </div>
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {house.holdings.map((h) => (
              <div
                key={h.ticker}
                className="rounded-lg border border-terminal-border bg-terminal-bg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{h.ticker}</span>
                    <span className="text-[11px] text-terminal-muted">
                      {h.name}
                    </span>
                  </div>
                  <span className="rounded bg-terminal-accent/10 px-2 py-0.5 text-[11px] text-terminal-accent">
                    {h.weightPct}%
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-terminal-muted">
                  {h.reasoning}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                  <span className="rounded bg-terminal-bg py-1 text-terminal-accent">
                    {t("common.buy")} {money(h.levels.ep)}
                  </span>
                  <span className="rounded bg-terminal-bg py-1 text-terminal-good">
                    {t("common.sell")} {money(h.levels.tp)}
                  </span>
                  <span className="rounded bg-terminal-bg py-1 text-terminal-bad">
                    {t("common.exit")} {money(h.levels.sl)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
