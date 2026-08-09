"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NewsItem, Stock } from "@/lib/types";
import NewsPopup from "@/components/NewsPopup";
import { useI18n } from "@/components/LanguageProvider";
import {
  loadPortfolio,
  loadSwaps,
  loadAdded,
  loadRemoved,
} from "@/lib/clientPortfolio";
import { stockFromHolding } from "@/lib/builder/map";
import {
  filterNewsForHoldings,
  type HoldingNewsItem,
  type HoldingRef,
} from "@/lib/holdingNews";

export default function BreakingNewsPage() {
  const { t } = useI18n();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<HoldingRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");
  const [open, setOpen] = useState<HoldingNewsItem | null>(null);

  useEffect(() => {
    const portfolio = loadPortfolio();
    const swaps = loadSwaps();
    const added = loadAdded();
    const removed = new Set(loadRemoved().map((x) => x.toUpperCase()));

    Promise.all([
      fetch("/api/news").then((r) => r.json()),
      fetch("/api/stocks").then((r) => r.json()),
    ])
      .then(([n, s]) => {
        const catalog: Stock[] = Array.isArray(s) ? s : [];
        setNews(Array.isArray(n) ? n : []);
        setStocks(catalog);

        const map = new Map(
          catalog.map((row) => [row.ticker.toUpperCase(), row] as const)
        );
        const refs: HoldingRef[] = [];
        const seen = new Set<string>();

        function pushRef(ticker: string, sector?: string, industry?: string) {
          const t = ticker.toUpperCase();
          if (seen.has(t)) return;
          seen.add(t);
          refs.push({ ticker: t, sector, industry });
        }

        for (const h of portfolio?.holdings ?? []) {
          if (removed.has(h.ticker.toUpperCase())) continue;
          const current = (swaps[h.ticker] ?? h.ticker).toUpperCase();
          const known = map.get(current);
          const stock =
            known ??
            stockFromHolding({ ...h, ticker: current }, map);
          if (!stock) {
            pushRef(current);
            continue;
          }
          pushRef(stock.ticker, stock.sector, stock.industry);
        }
        for (const h of added) {
          const known = map.get(h.ticker.toUpperCase());
          const stock = known ?? stockFromHolding(h, map);
          pushRef(
            stock?.ticker ?? h.ticker,
            stock?.sector ??
              (typeof h.snapshot?.sector === "string"
                ? h.snapshot.sector
                : undefined),
            stock?.industry ?? h.snapshot?.industry
          );
        }
        setHoldings(refs);
      })
      .finally(() => setLoading(false));
  }, []);

  const relevant = useMemo(
    () => filterNewsForHoldings(news, holdings, stocks),
    [news, holdings, stocks]
  );

  const filtered = relevant.filter((n) =>
    filter === "all" ? true : n.sentiment === filter
  );

  const hasPortfolio = holdings.length > 0;

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-wide sm:text-lg">
            {t("news.holdingTitle")}
          </h1>
          <p className="text-[10px] text-terminal-muted">
            {hasPortfolio
              ? t("news.holdingSubtitle", { n: holdings.length })
              : t("news.holdingEmptyHint")}
          </p>
        </div>
        {hasPortfolio ? (
          <div className="flex shrink-0 gap-0.5">
            {(
              [
                ["all", "filter.all"],
                ["good", "filter.good"],
                ["bad", "filter.bad"],
              ] as const
            ).map(([f, key]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-1 text-[10px] tracking-wider ${
                  filter === f
                    ? "bg-terminal-accent/15 text-terminal-accent"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="py-16 text-center text-terminal-muted">
          {t("common.loading")}
        </div>
      ) : !hasPortfolio ? (
        <div className="rounded-xl border border-terminal-border bg-terminal-panel px-4 py-10 text-center">
          <p className="text-sm text-terminal-muted">{t("news.holdingNeedBook")}</p>
          <Link
            href="/build"
            className="mt-4 inline-block rounded-full bg-terminal-accent px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-black"
          >
            {t("dash.getStarted")}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-terminal-border bg-terminal-panel px-4 py-10 text-center text-sm text-terminal-muted">
          {t("news.holdingNone")}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((item) => {
            const good = item.sentiment === "good";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpen(item)}
                className={`flex w-full min-w-0 flex-col gap-1.5 rounded-md border-l-2 px-2.5 py-2 text-left ${
                  good
                    ? "border-l-terminal-good border border-terminal-good/15 bg-terminal-good/[0.06]"
                    : "border-l-terminal-bad border border-terminal-bad/15 bg-terminal-bad/[0.06]"
                }`}
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <span
                    className={`w-9 shrink-0 text-[9px] font-bold uppercase tracking-wider ${
                      good ? "text-terminal-good" : "text-terminal-bad"
                    }`}
                  >
                    {good ? t("newsline.good") : t("newsline.bad")}
                  </span>
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px] leading-none text-terminal-text">
                    {item.line}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 ps-11">
                  <span className="text-[9px] uppercase tracking-wider text-terminal-muted">
                    {t("news.mayAffect")}
                  </span>
                  {item.affects.map((sym) => (
                    <span
                      key={sym}
                      className="rounded bg-terminal-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-terminal-accent"
                      title={
                        item.affectWhy[sym] === "holding"
                          ? t("news.whyHolding")
                          : item.affectWhy[sym] === "industry"
                            ? t("news.whyIndustry")
                            : t("news.whySector")
                      }
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open ? (
        <NewsPopup
          item={open}
          onClose={() => setOpen(null)}
          affects={open.affects}
          affectWhy={open.affectWhy}
        />
      ) : null}
    </div>
  );
}
