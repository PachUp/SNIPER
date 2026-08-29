"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Idea, Stock } from "@/lib/types";
import { useI18n } from "@/components/LanguageProvider";
import ReasoningPopup from "@/components/ReasoningPopup";
import CompactStockRow from "@/components/CompactStockRow";
import Skeleton from "@/components/Skeleton";
import {
  loadAdded,
  loadPortfolio,
  loadRemoved,
  loadSwaps,
} from "@/lib/clientPortfolio";

function ideaToStock(idea: Idea): Stock {
  return {
    ticker: idea.ticker,
    name: idea.name,
    sector: idea.sector,
    industry: idea.industry,
    price: idea.levels.ep,
    fairValue: idea.levels.tp,
    upsidePct: idea.upsidePct,
    beta: 1,
    sharpe: 0,
    business: idea.business,
    reasoning: idea.entry || idea.thesis,
    numbers: idea.numbers,
    levels: idea.levels,
    alternatives: [],
  };
}

function holdingTickerSet(): Set<string> {
  const out = new Set<string>();
  const removed = new Set(loadRemoved().map((t) => t.toUpperCase()));
  const swaps = loadSwaps();
  const portfolio = loadPortfolio();
  for (const h of portfolio?.holdings ?? []) {
    if (removed.has(h.ticker.toUpperCase())) continue;
    const current = (swaps[h.ticker] ?? h.ticker).toUpperCase();
    out.add(current);
  }
  for (const h of loadAdded()) {
    out.add(h.ticker.toUpperCase());
  }
  return out;
}

export default function IdeasPage() {
  const { t } = useI18n();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Stock | null>(null);
  const [bookTickers, setBookTickers] = useState<Set<string>>(new Set());

  useEffect(() => {
    function refreshBook() {
      setBookTickers(holdingTickerSet());
    }
    refreshBook();
    window.addEventListener("sniper:portfolio", refreshBook);
    return () => window.removeEventListener("sniper:portfolio", refreshBook);
  }, []);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d: Idea[]) => {
        setIdeas(d);
        for (const idea of d) {
          const img = new Image();
          img.src = `/logos/${encodeURIComponent(idea.ticker)}.png?v=native`;
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    return [...ideas].sort((a, b) => {
      const aIn = bookTickers.has(a.ticker.toUpperCase()) ? 0 : 1;
      const bIn = bookTickers.has(b.ticker.toUpperCase()) ? 0 : 1;
      return aIn - bIn;
    });
  }, [ideas, bookTickers]);

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div>
        <h1 className="text-base font-bold tracking-wide sm:text-lg">
          {t("ideas.title")}
        </h1>
        <p className="text-[10px] text-terminal-muted">
          {t("ideas.subtitle")} · {t("perf.tapRow")}
        </p>
      </div>

      {loading ? (
        <Skeleton variant="row" count={8} className="mt-2" />
      ) : ideas.length === 0 ? (
        <div className="mt-4 rounded-xl border border-terminal-border bg-terminal-panel px-5 py-12 text-center">
          <p className="text-sm leading-relaxed text-terminal-muted">
            {t("ideas.empty")}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/build"
              className="inline-block rounded-full bg-terminal-accent px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-black"
            >
              {t("ideas.emptyBuild")}
            </Link>
            <Link
              href="/snipers"
              className="inline-block rounded-full border border-terminal-accent/40 px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-terminal-accent"
            >
              {t("ideas.emptyHouse")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid auto-rows-min grid-cols-1 content-start gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((idea) => {
            const inBook = bookTickers.has(idea.ticker.toUpperCase());
            return (
              <CompactStockRow
                key={idea.id}
                ticker={idea.ticker}
                name={idea.name}
                badge={inBook ? t("ideas.inBook") : undefined}
                onClick={() => setPopup(ideaToStock(idea))}
              />
            );
          })}
        </div>
      )}

      {popup ? (
        <ReasoningPopup stock={popup} onClose={() => setPopup(null)} />
      ) : null}
    </div>
  );
}
