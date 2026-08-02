"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money, riskColorClass } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import R2rPlDetails from "@/components/R2rPlDetails";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";

export default function ReasoningPopup({
  stock,
  onClose,
  livePrice,
  sinceEntry,
  extras,
}: {
  stock: Stock;
  onClose: () => void;
  livePrice?: number | null;
  sinceEntry?: number | null;
  extras?: ReactNode;
}) {
  const { t, sector, risk } = useI18n();
  const [showPl, setShowPl] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const displayPrice =
    livePrice != null && Number.isFinite(livePrice) ? livePrice : stock.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-terminal-border bg-terminal-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <TickerLogo symbol={stock.ticker} size={32} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{stock.ticker}</span>
                  <SinceEntryBadge
                    value={sinceEntry ?? null}
                    variant="compact"
                    showEmpty={false}
                  />
                </div>
                <div className="truncate text-sm text-terminal-muted">
                  {stock.name}
                </div>
              </div>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-terminal-muted">
              {sector(stock.sector)}
              {stock.industry ? ` · ${stock.industry}` : ""}
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

        {stock.business ? (
          <p className="mt-3 text-sm leading-relaxed text-terminal-text">
            {stock.business}
          </p>
        ) : null}
        <p
          className={`text-sm leading-relaxed ${
            stock.business
              ? "mt-2 text-terminal-muted"
              : "mt-3 text-terminal-text"
          }`}
        >
          {stock.reasoning}
        </p>
        {stock.numbers ? (
          <div className="mt-3 rounded-md border border-terminal-border bg-black/50 px-3 py-2">
            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-terminal-muted">
              {t("reason.numbers")}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-white/85">
              {stock.numbers}
            </p>
          </div>
        ) : null}

        <R2rPlDetails
          levels={stock.levels}
          open={showPl}
          onToggle={() => setShowPl((v) => !v)}
          className="mt-3"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-terminal-muted">{t("reason.riskLevel")}</span>
          <span className={`font-bold ${riskColorClass(stock.beta)}`}>
            {risk(stock.beta)}
          </span>
          <span className="ms-1 text-terminal-muted">
            {t("reason.todayPrice")}
          </span>
          <span className="font-bold text-terminal-text">
            {money(displayPrice)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Level label={t("level.ep")} value={money(stock.levels.ep)} tone="accent" />
          <Level label={t("level.tp")} value={money(stock.levels.tp)} tone="good" />
          <Level label={t("level.sl")} value={money(stock.levels.sl)} tone="bad" />
        </div>

        {extras ? <div className="mt-3">{extras}</div> : null}

        <div className="mt-3 text-center text-[11px] text-terminal-muted">
          {t("reason.help")}
        </div>
        <div className="mt-1 text-center text-[10px] text-terminal-muted">
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
