"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BuiltPortfolio, NewsItem, PortfolioHolding, Stock } from "@/lib/types";
import {
  loadPortfolio,
  loadSwaps,
  saveSwap,
  clearPortfolio,
} from "@/lib/clientPortfolio";
import { money, pct, riskColorClass } from "@/lib/format";
import { stockFromHolding } from "@/lib/builder/map";
import PerformanceChart from "@/components/PerformanceChart";
import ReasoningPopup from "@/components/ReasoningPopup";
import SwitchArrow from "@/components/SwitchArrow";
import NewsLine from "@/components/NewsLine";
import { useI18n } from "@/components/LanguageProvider";

type HoldingView = {
  original: string;
  current: string;
  source: "user" | "ai";
  weightPct?: number;
  holding: PortfolioHolding;
};

export default function DashboardPage() {
  const { t, risk } = useI18n();
  const [portfolio, setPortfolio] = useState<BuiltPortfolio | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Stock | null>(null);

  useEffect(() => {
    setPortfolio(loadPortfolio());
    setSwaps(loadSwaps());
    Promise.all([
      fetch("/api/stocks").then((r) => r.json()),
      fetch("/api/news").then((r) => r.json()),
    ])
      .then(([s, n]) => {
        setStocks(s);
        setNews(n);
      })
      .finally(() => setLoading(false));
  }, []);

  const stockMap = useMemo(() => {
    const m = new Map<string, Stock>();
    for (const s of stocks) m.set(s.ticker, s);
    // Overlay Builder snapshots so holdings missing from mock stocks.json still render.
    if (portfolio) {
      for (const h of portfolio.holdings) {
        if (!m.has(h.ticker)) {
          const fromSnap = stockFromHolding(h);
          if (fromSnap) m.set(h.ticker, fromSnap);
        }
      }
    }
    return m;
  }, [stocks, portfolio]);

  const holdings = useMemo<HoldingView[]>(() => {
    if (!portfolio) return [];
    return portfolio.holdings.map((h) => ({
      original: h.ticker,
      current: swaps[h.ticker] ?? h.ticker,
      source: h.source,
      weightPct: h.weightPct,
      holding: h,
    }));
  }, [portfolio, swaps]);

  const currentStocks = useMemo(() => {
    return holdings
      .map((h) => {
        const fromApi = stockMap.get(h.current);
        if (fromApi) return fromApi;
        // Swapped ticker with no mock row: fall back to original snapshot.
        return stockFromHolding(h.holding);
      })
      .filter((s): s is Stock => Boolean(s));
  }, [holdings, stockMap]);

  function poolFor(original: string): Stock[] {
    const base = stockMap.get(original);
    if (!base) return [];
    const tickers = new Set<string>([original, ...base.alternatives]);
    return [...tickers]
      .map((t) => stockMap.get(t))
      .filter((s): s is Stock => Boolean(s) && s!.sector === base.sector)
      .sort((a, b) => a.beta - b.beta);
  }

  function handleSwitch(original: string, next: string) {
    saveSwap(original, next);
    setSwaps((prev) => ({ ...prev, [original]: next }));
  }

  const topNews = useMemo(() => {
    const held = new Set(currentStocks.map((s) => s.ticker));
    return news.find((n) => n.tickers.some((t) => held.has(t))) ?? null;
  }, [news, currentStocks]);

  if (loading) {
    return (
      <div className="py-20 text-center text-terminal-muted">
        {t("common.loading")}
      </div>
    );
  }

  if (!portfolio || holdings.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-terminal-muted">{t("dash.empty")}</p>
        <Link
          href="/build"
          className="mt-4 inline-block rounded-full bg-terminal-accent px-8 py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg"
        >
          {t("dash.getStarted")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">{t("dash.title")}</h1>
          <p className="text-xs text-terminal-muted">
            {t("dash.meta", {
              n: holdings.length,
              date: new Date(portfolio.createdAt).toLocaleDateString(),
            })}
          </p>
        </div>
        <button
          onClick={() => {
            clearPortfolio();
            window.location.href = "/build";
          }}
          className="rounded-md border border-terminal-border px-3 py-1.5 text-xs text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
        >
          {t("dash.startOver")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* TOP-LEFT: performance */}
        <PerformanceChart holdings={currentStocks} />

        {/* TOP-RIGHT: holdings */}
        <div className="rounded-xl border border-terminal-border bg-terminal-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs tracking-[0.25em] text-terminal-muted">
              {t("dash.yourStocks")}
            </span>
            <span className="text-[11px] text-terminal-muted">
              {t("dash.tapHint")}
            </span>
          </div>
          <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {holdings.map((h) => {
              const s =
                stockMap.get(h.current) ?? stockFromHolding(h.holding);
              if (!s) return null;
              const switchPool = poolFor(h.original);
              return (
                <button
                  key={h.original}
                  onClick={() => setPopup(s)}
                  className="rounded-lg border border-terminal-border bg-terminal-bg p-3 text-left transition-colors hover:border-terminal-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{s.ticker}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${
                        h.source === "ai"
                          ? "bg-terminal-accent/10 text-terminal-accent"
                          : "bg-terminal-border text-terminal-muted"
                      }`}
                    >
                      {h.source === "ai" ? t("dash.ourPick") : t("dash.yourPick")}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-terminal-muted">
                    {s.name}
                    {h.weightPct != null ? ` · ${h.weightPct.toFixed(1)}%` : ""}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-terminal-good">
                      {t("common.potential", { v: pct(s.upsidePct) })}
                    </span>
                    {h.source === "ai" && switchPool.length > 1 ? (
                      <SwitchArrow
                        pool={switchPool}
                        currentTicker={h.current}
                        onSwitch={(next) => handleSwitch(h.original, next)}
                      />
                    ) : (
                      <span
                        className={`text-[10px] ${riskColorClass(s.beta)}`}
                      >
                        {t("common.riskSuffix", { level: risk(s.beta) })}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                    <span className="rounded bg-terminal-panel py-1 text-terminal-accent">
                      {t("common.buy")} {money(s.levels.ep)}
                    </span>
                    <span className="rounded bg-terminal-panel py-1 text-terminal-good">
                      {t("common.sell")} {money(s.levels.tp)}
                    </span>
                    <span className="rounded bg-terminal-panel py-1 text-terminal-bad">
                      {t("common.exit")} {money(s.levels.sl)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM: most relevant holdings news */}
      <div className="mt-4">
        <div className="mb-2 text-xs tracking-[0.25em] text-terminal-muted">
          {t("dash.latestNews")}
        </div>
        {topNews ? (
          <NewsLine item={topNews} />
        ) : (
          <div className="rounded-lg border border-terminal-border bg-terminal-panel px-4 py-3 text-sm text-terminal-muted">
            {t("dash.noNews")}
          </div>
        )}
      </div>

      {popup && <ReasoningPopup stock={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}
