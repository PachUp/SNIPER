"use client";

import { useEffect, useMemo, useState } from "react";
import type { HousePortfolio, Stock } from "@/lib/types";
import PerformanceChart from "@/components/PerformanceChart";
import ReasoningPopup from "@/components/ReasoningPopup";
import CompactStockRow from "@/components/CompactStockRow";
import { useI18n } from "@/components/LanguageProvider";
import {
  fetchLiveQuotesClient,
  livePortfolioReturnPct,
  returnSinceEntryPct,
} from "@/lib/livePerformance";

function holdingToStock(h: HousePortfolio["holdings"][number]): Stock {
  return {
    ticker: h.ticker,
    name: h.name,
    sector: h.sector,
    industry: h.industry,
    price: h.levels.ep,
    fairValue: h.levels.tp,
    upsidePct: 0,
    beta: 1,
    sharpe: 0,
    business: h.business,
    reasoning: h.reasoning,
    numbers: h.numbers,
    levels: h.levels,
    alternatives: [],
  };
}

export default function SnipersPage() {
  const { t } = useI18n();
  const [house, setHouse] = useState<HousePortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Stock | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, number>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  useEffect(() => {
    fetch("/api/snipers")
      .then((r) => r.json())
      .then((d: HousePortfolio) => {
        setHouse(d);
        for (const h of d.holdings ?? []) {
          const img = new Image();
          img.src = `/logos/${encodeURIComponent(h.ticker)}.png?v=native`;
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const symbols = (house?.holdings ?? []).map((h) => h.ticker);
    if (symbols.length === 0) {
      setLiveQuotes({});
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    fetchLiveQuotesClient(symbols)
      .then((q) => {
        if (!cancelled) setLiveQuotes(q);
      })
      .catch(() => {
        if (!cancelled) setLiveQuotes({});
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });
    const id = window.setInterval(() => {
      fetchLiveQuotesClient(symbols)
        .then((q) => {
          if (!cancelled) setLiveQuotes(q);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [house]);

  const liveReturnPct = useMemo(() => {
    if (!house) return 0;
    return livePortfolioReturnPct(
      house.holdings.map((h) => ({
        ticker: h.ticker,
        entry: h.levels?.ep ?? 0,
        weightPct: h.weightPct,
        live: liveQuotes[h.ticker.toUpperCase()] ?? 0,
      }))
    );
  }, [house, liveQuotes]);

  const chartPositions = useMemo(
    () =>
      (house?.holdings ?? [])
        .filter((h) => Number.isFinite(h.levels?.ep) && h.levels.ep > 0)
        .map((h) => ({
          ticker: h.ticker,
          entry: h.levels.ep,
          weightPct: h.weightPct,
        })),
    [house]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-terminal-muted">
        {t("common.loading")}
      </div>
    );
  }
  if (!house) {
    return (
      <div className="flex flex-1 items-center justify-center text-terminal-muted">
        {t("snipers.noHouse")}
      </div>
    );
  }

  const popupLive = popup
    ? liveQuotes[popup.ticker.toUpperCase()] ?? null
    : null;
  const popupSince =
    popup && popup.levels.ep > 0 && popupLive != null
      ? returnSinceEntryPct(popup.levels.ep, popupLive)
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <h1 className="truncate text-base font-bold tracking-wide sm:text-lg">
          {house.name}
        </h1>
        <p className="truncate text-[10px] text-terminal-muted">
          {t("snipers.subtitle", {
            date: new Date(house.updated).toLocaleDateString(),
          })}{" "}
          · {t("perf.tapRow")}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,38%)_minmax(0,62%)] gap-2 lg:grid-cols-2 lg:grid-rows-1">
        <PerformanceChart
          compact
          liveReturnPct={liveReturnPct}
          positions={chartPositions}
          loading={quotesLoading}
          title={t("perf.house")}
          subtitle={t("perf.houseLive")}
        />

        <div className="flex min-h-0 flex-col rounded-xl border border-terminal-border bg-terminal-panel p-2">
          <div className="mb-1.5 shrink-0 text-[10px] tracking-[0.2em] text-terminal-muted">
            {t("snipers.holdings")}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 content-start gap-1 overflow-y-auto sm:grid-cols-2">
            {house.holdings.map((h) => {
              const livePx = liveQuotes[h.ticker.toUpperCase()];
              const sinceEntry =
                h.levels?.ep > 0 && livePx != null
                  ? returnSinceEntryPct(h.levels.ep, livePx)
                  : null;
              return (
                <CompactStockRow
                  key={h.ticker}
                  ticker={h.ticker}
                  name={h.name}
                  sinceEntry={sinceEntry}
                  weightPct={h.weightPct}
                  onClick={() =>
                    setPopup({
                      ...holdingToStock(h),
                      price: livePx ?? h.levels.ep,
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {popup ? (
        <ReasoningPopup
          stock={popup}
          onClose={() => setPopup(null)}
          livePrice={popupLive}
          sinceEntry={popupSince}
        />
      ) : null}
    </div>
  );
}
