"use client";

import { useEffect, useMemo, useState } from "react";
import type { HousePortfolio, Stock } from "@/lib/types";
import PerformanceChart from "@/components/PerformanceChart";
import ReasoningPopup from "@/components/ReasoningPopup";
import StockTradePanel from "@/components/StockTradePanel";
import PortfolioWeightPie from "@/components/PortfolioWeightPie";
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

  const weightSlices = useMemo(
    () =>
      (house?.holdings ?? []).map((h) => ({
        ticker: h.ticker,
        sector: h.sector || "Other",
        industry: h.industry,
        weightPct:
          typeof h.weightPct === "number" && h.weightPct > 0 ? h.weightPct : 0,
      })),
    [house]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-terminal-muted">
        {t("common.loading")}
      </div>
    );
  }
  if (!house) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-terminal-muted">
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
    <div className="flex flex-col gap-3 pb-4">
      <div>
        <h1 className="truncate text-base font-bold tracking-wide sm:text-lg">
          {house.name}
        </h1>
        <p className="text-[10px] text-terminal-muted">
          {t("snipers.subtitle", {
            date: new Date(house.updated).toLocaleDateString(),
          })}
        </p>
      </div>

      <div className="min-h-[220px] sm:min-h-[260px]">
        <PerformanceChart
          compact
          liveReturnPct={liveReturnPct}
          positions={chartPositions}
          loading={quotesLoading}
          title={t("perf.house")}
          subtitle={t("perf.houseLive")}
        />
      </div>

      <div>
        <div className="mb-1.5 text-[10px] tracking-[0.2em] text-terminal-muted">
          {t("snipers.tradePanels")}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {house.holdings.map((h) => {
            const livePx = liveQuotes[h.ticker.toUpperCase()];
            const sinceEntry =
              h.levels?.ep > 0 && livePx != null
                ? returnSinceEntryPct(h.levels.ep, livePx)
                : null;
            const stock = {
              ...holdingToStock(h),
              price: livePx ?? h.levels.ep,
            };
            return (
              <StockTradePanel
                key={`panel-${h.ticker}`}
                stock={stock}
                sinceEntry={sinceEntry}
                weightPct={h.weightPct}
                livePrice={livePx}
                epLabel={t("level.houseEp")}
                epTip={t("level.houseEpTip")}
                onClick={() => setPopup(stock)}
              />
            );
          })}
        </div>
      </div>

      <PortfolioWeightPie
        holdings={weightSlices}
        title={t("snipers.allocTitle")}
        hint={t("snipers.allocHint")}
        empty={t("snipers.allocEmpty")}
      />

      {popup ? (
        <ReasoningPopup
          stock={popup}
          onClose={() => setPopup(null)}
          livePrice={popupLive}
          sinceEntry={popupSince}
          epLabel={t("level.houseEp")}
          epTip={t("level.houseEpTip")}
        />
      ) : null}
    </div>
  );
}
