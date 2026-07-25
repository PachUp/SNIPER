"use client";

import { useEffect, useState } from "react";
import type { Idea } from "@/lib/types";
import { money, pct } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

export default function IdeasPage() {
  const { t, sector } = useI18n();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d: Idea[]) => setIdeas(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-wide">{t("ideas.title")}</h1>
        <p className="text-xs text-terminal-muted">{t("ideas.subtitle")}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-terminal-muted">
          {t("common.loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="rounded-xl border border-terminal-border bg-terminal-panel p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{idea.ticker}</span>
                    <span className="text-sm text-terminal-muted">
                      {idea.name}
                    </span>
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-terminal-muted">
                    {sector(idea.sector)}
                  </div>
                </div>
                <span className="rounded-full bg-terminal-good/10 px-3 py-1 text-sm font-bold text-terminal-good">
                  {t("common.potential", { v: pct(idea.upsidePct) })}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-terminal-text">
                {idea.thesis}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-terminal-border bg-terminal-bg p-2">
                  <div className="text-[10px] tracking-wider text-terminal-muted">
                    {t("level.ep")}
                  </div>
                  <div className="mt-1 font-bold text-terminal-accent">
                    {money(idea.levels.ep)}
                  </div>
                </div>
                <div className="rounded-lg border border-terminal-border bg-terminal-bg p-2">
                  <div className="text-[10px] tracking-wider text-terminal-muted">
                    {t("level.tp")}
                  </div>
                  <div className="mt-1 font-bold text-terminal-good">
                    {money(idea.levels.tp)}
                  </div>
                </div>
                <div className="rounded-lg border border-terminal-border bg-terminal-bg p-2">
                  <div className="text-[10px] tracking-wider text-terminal-muted">
                    {t("level.sl")}
                  </div>
                  <div className="mt-1 font-bold text-terminal-bad">
                    {money(idea.levels.sl)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
