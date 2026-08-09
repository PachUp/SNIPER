"use client";

import type { ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";
import LevelInfo from "@/components/LevelInfo";

/**
 * 5-second read: who it is + why own it.
 * EP/TP/SL stay compact. “More” opens fundamentals.
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
  const what = (stock.business || "").replace(/\s+/g, " ").trim();
  const why = (stock.reasoning || "").replace(/\s+/g, " ").trim();
  const numbers = (stock.numbers || "").replace(/\s+/g, " ").trim();

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-xl border border-terminal-border bg-terminal-panel p-3">
      <div className="flex items-start gap-2.5">
        <TickerLogo symbol={stock.ticker} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold tracking-wide text-white">
              {stock.ticker}
            </span>
            <SinceEntryBadge
              value={sinceEntry ?? null}
              variant="compact"
              showEmpty={false}
            />
            {badge ? (
              <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase tracking-wider text-terminal-muted">
                {badge}
              </span>
            ) : null}
            {typeof weightPct === "number" ? (
              <span className="text-[11px] text-terminal-accent">{weightPct}%</span>
            ) : null}
            {trailing ? (
              <span className="ms-auto flex shrink-0 items-center gap-0.5">
                {trailing}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[13px] leading-snug text-white/65">
            {stock.name}
            {px > 0 ? (
              <span className="text-white/40"> · {money(px)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stands out: what + why — full wrap, no ellipsis */}
      <div className="space-y-1.5 rounded-lg border border-terminal-accent/20 bg-terminal-accent/[0.06] px-3 py-2.5">
        {what ? (
          <p className="text-[13px] leading-relaxed text-white/85">{what}</p>
        ) : null}
        {why ? (
          <p className="text-[13px] font-medium leading-relaxed text-white">
            {why}
          </p>
        ) : null}
        {numbers ? (
          <p className="text-[12px] leading-relaxed text-terminal-accent/90">
            {numbers}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
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
        className="self-start text-[12px] font-medium text-terminal-accent hover:underline"
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
    <div className="rounded-lg border border-terminal-border bg-black/40 px-1.5 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1">
        <LevelInfo tip={tip} />
        <span className="text-[9px] tracking-wider text-terminal-muted">
          {label}
        </span>
      </div>
      <div className={`mt-1 text-xs font-bold tabular-nums ${color}`}>{value}</div>
      {under ? <div className="mt-1">{under}</div> : null}
    </div>
  );
}
