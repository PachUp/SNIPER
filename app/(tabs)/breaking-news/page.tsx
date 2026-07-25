"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";
import NewsLine from "@/components/NewsLine";
import { useI18n } from "@/components/LanguageProvider";

export default function BreakingNewsPage() {
  const { t } = useI18n();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">{t("news.title")}</h1>
          <p className="text-xs text-terminal-muted">{t("news.subtitle")}</p>
        </div>
        <div className="flex gap-1">
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
              className={`rounded px-3 py-1.5 text-xs tracking-wider ${
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
        <div className="flex flex-col gap-2">
          {filtered.map((n) => (
            <NewsLine key={n.id} item={n} />
          ))}
        </div>
      )}
    </div>
  );
}
