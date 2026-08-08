"use client";

import { useEffect, useState } from "react";
import type { Idea, Stock } from "@/lib/types";
import { useI18n } from "@/components/LanguageProvider";
import ReasoningPopup from "@/components/ReasoningPopup";
import CompactStockRow from "@/components/CompactStockRow";

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

export default function IdeasPage() {
  const { t } = useI18n();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Stock | null>(null);

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
        <div className="py-16 text-center text-terminal-muted">
          {t("common.loading")}
        </div>
      ) : (
        <div className="grid auto-rows-min grid-cols-1 content-start gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <CompactStockRow
              key={idea.id}
              ticker={idea.ticker}
              name={idea.name}
              onClick={() => setPopup(ideaToStock(idea))}
            />
          ))}
        </div>
      )}

      {popup ? (
        <ReasoningPopup stock={popup} onClose={() => setPopup(null)} />
      ) : null}
    </div>
  );
}
