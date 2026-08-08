"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";
import NewsPopup from "@/components/NewsPopup";
import { useI18n } from "@/components/LanguageProvider";

export default function BreakingNewsPage() {
  const { t } = useI18n();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");
  const [open, setOpen] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((n: NewsItem[]) => setNews(n))
      .finally(() => setLoading(false));
  }, []);

  const filtered = news.filter((n) =>
    filter === "all" ? true : n.sentiment === filter
  );

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-wide sm:text-lg">
            {t("news.title")}
          </h1>
          <p className="truncate text-[10px] text-terminal-muted">
            {t("news.subtitle")}
          </p>
        </div>
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
      </div>

      {loading ? (
        <div className="py-16 text-center text-terminal-muted">
          {t("common.loading")}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((item) => {
            const good = item.sentiment === "good";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpen(item)}
                className={`flex w-full min-w-0 items-center gap-2 rounded-md border-l-2 px-2.5 py-2 text-left ${
                  good
                    ? "border-l-terminal-good border border-terminal-good/15 bg-terminal-good/[0.06]"
                    : "border-l-terminal-bad border border-terminal-bad/15 bg-terminal-bad/[0.06]"
                }`}
              >
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
                <span className="hidden shrink-0 text-[9px] text-terminal-muted sm:inline">
                  {t("newsline.details")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open ? <NewsPopup item={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
