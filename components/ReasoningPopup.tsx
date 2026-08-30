"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money, riskColorClass } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import R2rPlDetails from "@/components/R2rPlDetails";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";
import LevelInfo from "@/components/LevelInfo";
import { useIosSheet } from "@/lib/useIosSheet";

export default function ReasoningPopup({
  stock,
  onClose,
  livePrice,
  sinceEntry,
  extras,
  epLabel,
  epTip,
}: {
  stock: Stock;
  onClose: () => void;
  livePrice?: number | null;
  sinceEntry?: number | null;
  extras?: ReactNode;
  epLabel?: string;
  epTip?: string;
}) {
  const { t, sector, risk } = useI18n();
  const [showPl, setShowPl] = useState(false);
  useIosSheet(true);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="ios-sheet max-w-md border border-terminal-border bg-terminal-panel px-5 pt-3 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ios-grabber" />
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
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-lg text-terminal-muted"
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
          <Level
            tip={epTip ?? t("level.epTip")}
            label={epLabel ?? t("level.ep")}
            value={money(stock.levels.ep)}
            tone="accent"
          />
          <Level
            tip={t("level.tpTip")}
            label={t("level.tp")}
            value={money(stock.levels.tp)}
            tone="good"
          />
          <Level
            tip={t("level.slTip")}
            label={t("level.sl")}
            value={money(stock.levels.sl)}
            tone="bad"
          />
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
  tip,
  label,
  value,
  tone,
}: {
  tip: string;
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
      <div className="flex items-center justify-center gap-1">
        <LevelInfo tip={tip} />
        <div className="text-[10px] tracking-wider text-terminal-muted">
          {label}
        </div>
      </div>
      <div className={`mt-1 text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
