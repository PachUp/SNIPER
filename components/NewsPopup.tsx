"use client";

import { useEffect } from "react";
import type { NewsItem } from "@/lib/types";
import { useI18n } from "@/components/LanguageProvider";

export default function NewsPopup({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const { t, ago } = useI18n();
  const good = item.sentiment === "good";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${
              good
                ? "bg-terminal-good/15 text-terminal-good"
                : "bg-terminal-bad/15 text-terminal-bad"
            }`}
          >
            {good ? t("newsline.good") : t("newsline.bad")}
          </span>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold leading-snug text-terminal-text">
          {item.line}
        </h2>

        {item.details && (
          <p className="mt-3 text-sm leading-relaxed text-terminal-muted">
            {item.details}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-terminal-muted">
            {t("popup.companies")}
          </span>
          {item.tickers.map((ticker) => (
            <span
              key={ticker}
              className="rounded bg-terminal-bg px-1.5 py-0.5 text-[10px] font-bold text-terminal-muted"
            >
              {ticker}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-terminal-border pt-4">
          <span className="text-[11px] text-terminal-muted">
            {item.source} · {ago(item.timestamp)}
          </span>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-terminal-accent/10 px-3 py-1.5 text-xs font-bold text-terminal-accent hover:bg-terminal-accent/20"
          >
            {t("popup.readFull")}
          </a>
        </div>

        <p className="mt-3 text-center text-[10px] text-terminal-muted">
          {t("popup.notAdvice")}
        </p>
      </div>
    </div>
  );
}
