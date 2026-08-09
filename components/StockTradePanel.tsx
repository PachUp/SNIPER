"use client";

import type { ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";
import LevelInfo from "@/components/LevelInfo";

/**
 * Company + core business + EP/TP/SL — full text, no ellipsis.
 * Only “More” opens thesis / numbers.
 */
export default function StockTradePanel({
  stock,
  sinceEntry,
  weightPct,
  badge,
  livePrice,
  onClick,
  buyControl,
  trailing,
}: {
  stock: Stock;
  sinceEntry?: number | null;
  weightPct?: number;
  badge?: string;
  livePrice?: number | null;
  onClick: () => void;
  buyControl?: ReactNode;
  trailing?: ReactNode;
}) {
  const { t } = useI18n();
  const px =
    livePrice != null && Number.isFinite(livePrice) ? livePrice : stock.price;
  const business = (stock.business || "").replace(/\s+/g, " ").trim();

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-terminal-border bg-terminal-panel p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <TickerLogo symbol={stock.ticker} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold tracking-wide text-white">
              {stock.ticker}
            </span>
            <SinceEntryBadge
              value={sinceEntry ?? null}
              variant="compact"
              showEmpty={false}
            />
            {badge ? (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-terminal-muted">
                {badge}
              </span>
            ) : null}
            {typeof weightPct === "number" ? (
              <span className="text-xs font-medium text-terminal-accent">
                {weightPct}%
              </span>
            ) : null}
            {trailing ? (
              <span className="ms-auto flex shrink-0 items-center gap-0.5">
                {trailing}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-sm leading-snug text-white/70">
            {stock.name}
            {px > 0 ? (
              <span className="text-white/45"> · {money(px)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {business ? (
        <p className="text-sm leading-relaxed text-white/90">{business}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <LevelCell
          tip={t("level.epTip")}
          label={t("level.ep")}
          value={money(stock.levels.ep)}
          tone="accent"
          under={buyControl}
        />
        <LevelCell
          tip={t("level.tpTip")}
          label={t("level.tp")}
          value={money(stock.levels.tp)}
          tone="good"
        />
        <LevelCell
          tip={t("level.slTip")}
          label={t("level.sl")}
          value={money(stock.levels.sl)}
          tone="bad"
        />
      </div>

      <button
        type="button"
        onClick={onClick}
        className="self-start text-sm font-medium text-terminal-accent hover:underline"
      >
        {t("panel.tapMore")}
      </button>
    </div>
  );
}

function LevelCell({
  tip,
  label,
  value,
  tone,
  under,
}: {
  tip: string;
  label: string;
  value: string;
  tone: "accent" | "good" | "bad";
  under?: ReactNode;
}) {
  const color =
    tone === "good"
      ? "text-terminal-good"
      : tone === "bad"
        ? "text-terminal-bad"
        : "text-terminal-accent";

  return (
    <div className="rounded-lg border border-terminal-border bg-black/40 px-2 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1">
        <LevelInfo tip={tip} />
        <span className="text-[10px] tracking-wider text-terminal-muted">
          {label}
        </span>
      </div>
      <div className={`mt-1.5 text-base font-bold tabular-nums ${color}`}>
        {value}
      </div>
      {under ? <div className="mt-1.5">{under}</div> : null}
    </div>
  );
}
