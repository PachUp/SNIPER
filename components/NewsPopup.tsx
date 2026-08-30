"use client";

import { useEffect } from "react";
import type { NewsItem } from "@/lib/types";
import { useI18n } from "@/components/LanguageProvider";
import { useIosSheet } from "@/lib/useIosSheet";

export default function NewsPopup({
  item,
  onClose,
  affects,
  affectWhy,
}: {
  item: NewsItem;
  onClose: () => void;
  affects?: string[];
  affectWhy?: Record<string, "holding" | "industry" | "sector" | string>;
}) {
  const { t, ago } = useI18n();
  const good = item.sentiment === "good";
  useIosSheet(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="ios-sheet max-w-md border border-terminal-border bg-terminal-panel px-5 pt-3 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ios-grabber" />
        <div className="flex items-start justify-between gap-3">
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.14em] ${
              good
                ? "bg-terminal-good/15 text-terminal-good"
                : "bg-terminal-bad/15 text-terminal-bad"
            }`}
          >
            {good ? t("newsline.good") : t("newsline.bad")}
          </span>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-lg text-terminal-muted"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <h2 className="mt-4 text-[15px] font-semibold leading-[1.4] tracking-[0.01em] text-white">
          {item.line}
        </h2>

        {item.details ? (
          <div className="mt-4 rounded-xl border border-terminal-border bg-black/40 px-3.5 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-terminal-accent">
              {t("popup.edge")}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/70">
              {item.details}
            </p>
          </div>
        ) : null}

        {affects && affects.length > 0 ? (
          <div className="mt-4 rounded-xl border border-terminal-accent/30 bg-terminal-accent/10 px-3.5 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-terminal-accent">
              {t("news.yourHolding")}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {affects.map((ticker) => {
                const whyLabel =
                  affectWhy?.[ticker] === "holding" || !affectWhy?.[ticker]
                    ? t("news.whyHolding")
                    : "";
                return (
                  <span
                    key={ticker}
                    className="rounded-md bg-black/40 px-2.5 py-1 text-[12px] font-bold text-terminal-accent"
                    title={whyLabel}
                  >
                    {ticker}
                    {whyLabel ? (
                      <span className="ms-1 font-normal text-white/50">
                        · {whyLabel}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-terminal-muted">
            {t("popup.companies")}
          </span>
          {item.tickers.map((ticker) => (
            <span
              key={ticker}
              className="rounded-md bg-terminal-bg px-2 py-0.5 text-[10px] font-bold text-terminal-muted"
            >
              {ticker}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-terminal-border pt-4">
          <span className="text-[11px] text-terminal-muted">
            {item.source} · {ago(item.timestamp)}
          </span>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg bg-terminal-accent px-3.5 py-2 text-[12px] font-bold text-black"
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
