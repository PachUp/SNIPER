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
import Skeleton from "@/components/Skeleton";

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
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold tracking-wide text-white sm:text-base">
            {t("news.holdingTitle")}
          </h1>
          <p className="mt-1 max-w-[22rem] text-[11px] leading-relaxed text-terminal-muted">
            {hasPortfolio
              ? t("news.holdingSubtitle", { n: holdings.length })
              : t("news.holdingEmptyHint")}
          </p>
        </div>
        {hasPortfolio ? (
          <div className="flex shrink-0 gap-1 rounded-lg border border-terminal-border bg-terminal-panel/80 p-0.5">
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
                className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold tracking-wider ${
                  filter === f
                    ? "bg-terminal-accent/20 text-terminal-accent"
                    : "text-terminal-muted active:text-terminal-text"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <Skeleton variant="row" count={5} className="mt-2" />
      ) : !hasPortfolio ? (
        <div className="rounded-xl border border-terminal-border bg-terminal-panel px-5 py-12 text-center">
          <p className="text-sm leading-relaxed text-terminal-muted">
            {t("news.holdingNeedBook")}
          </p>
          <Link
            href="/build"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terminal-accent px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-black"
          >
            {t("dash.getStarted")}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-terminal-border bg-terminal-panel px-5 py-12 text-center text-sm leading-relaxed text-terminal-muted">
          <p>{t("news.holdingNone")}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex min-h-12 items-center rounded-full border border-terminal-accent/40 px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-terminal-accent"
          >
            {t("nav.dashboard")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => {
            const good = item.sentiment === "good";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpen(item)}
                className={`group flex w-full min-w-0 flex-col gap-2.5 rounded-xl border-l-[3px] px-3.5 py-3.5 text-left active:scale-[0.99] ${
                  good
                    ? "border-l-terminal-good border border-terminal-good/20 bg-terminal-good/[0.07] active:bg-terminal-good/[0.12]"
                    : "border-l-terminal-bad border border-terminal-bad/20 bg-terminal-bad/[0.07] active:bg-terminal-bad/[0.12]"
                }`}
              >
                <div className="flex w-full min-w-0 items-start gap-2.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                      good
                        ? "bg-terminal-good/15 text-terminal-good"
                        : "bg-terminal-bad/15 text-terminal-bad"
                    }`}
                  >
                    {good ? t("newsline.good") : t("newsline.bad")}
                  </span>
                  {/* Full sentence — roomy wrap, crisp type, never truncate */}
                  <span className="min-w-0 flex-1 whitespace-normal break-words text-[12px] font-medium leading-[1.45] tracking-[0.01em] text-white">
                    {item.line}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-terminal-muted">
                    {t("news.yourHolding")}
                  </span>
                  {item.affects.map((sym) => (
                    <span
                      key={sym}
                      className="rounded-md bg-terminal-accent/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-terminal-accent"
                      title={t("news.whyHolding")}
                    >
                      {sym}
                    </span>
                  ))}
                  <span className="ms-auto text-[11px] font-medium text-terminal-accent/90 group-active:text-terminal-accent">
                    {t("newsline.details")}
                  </span>
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
