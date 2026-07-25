"use client";

import { useEffect } from "react";
import type { Stock } from "@/lib/types";
import { money, pct, riskColorClass } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

export default function ReasoningPopup({
  stock,
  onClose,
}: {
  stock: Stock;
  onClose: () => void;
}) {
  const { t, sector, risk } = useI18n();
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
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stock.ticker}</span>
              <span
                className={`text-sm ${
                  stock.upsidePct >= 15
                    ? "text-terminal-good"
                    : "text-terminal-muted"
                }`}
              >
                {t("reason.growth", { v: pct(stock.upsidePct) })}
              </span>
            </div>
            <div className="text-sm text-terminal-muted">{stock.name}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-terminal-muted">
              {sector(stock.sector)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-terminal-text">
          {stock.reasoning}
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-terminal-muted">{t("reason.riskLevel")}</span>
          <span className={`font-bold ${riskColorClass(stock.beta)}`}>
            {risk(stock.beta)}
          </span>
          <span className="ms-2 text-terminal-muted">
            {t("reason.todayPrice")}
          </span>
          <span className="font-bold text-terminal-text">
            {money(stock.price)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Level label={t("level.ep")} value={money(stock.levels.ep)} tone="accent" />
          <Level label={t("level.tp")} value={money(stock.levels.tp)} tone="good" />
          <Level label={t("level.sl")} value={money(stock.levels.sl)} tone="bad" />
        </div>
        <div className="mt-3 text-center text-[11px] text-terminal-muted">
          {t("reason.help")}
        </div>
        <div className="mt-2 text-center text-[10px] text-terminal-muted">
          {t("reason.notAdvice")}
        </div>
      </div>
    </div>
  );
}

function Level({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "accent" | "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-terminal-good"
      : tone === "bad"
      ? "text-terminal-bad"
      : "text-terminal-accent";
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-bg p-2">
      <div className="text-[10px] tracking-wider text-terminal-muted">
        {label}
      </div>
      <div className={`mt-1 text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
