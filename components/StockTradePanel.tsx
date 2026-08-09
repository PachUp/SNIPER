"use client";

import type { ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";
import LevelInfo from "@/components/LevelInfo";

/** Company + EP/TP/SL at a glance. Only “More” opens thesis / numbers. */
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

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-terminal-border bg-terminal-panel p-2.5">
      <div className="flex items-start gap-2">
        <TickerLogo symbol={stock.ticker} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold tracking-wide">{stock.ticker}</span>
            <SinceEntryBadge
              value={sinceEntry ?? null}
              variant="compact"
              showEmpty={false}
            />
            {badge ? (
              <span className="rounded bg-white/5 px-1 py-0.5 text-[8px] uppercase tracking-wider text-terminal-muted">
                {badge}
              </span>
            ) : null}
            {typeof weightPct === "number" ? (
              <span className="text-[10px] text-terminal-muted">{weightPct}%</span>
            ) : null}
            {trailing ? (
              <span className="ms-auto flex shrink-0 items-center gap-0.5">
                {trailing}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-terminal-muted">
            {stock.name}
            {px > 0 ? ` · ${money(px)}` : ""}
          </div>
        </div>
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
        className="self-start text-[11px] font-medium text-terminal-accent hover:underline"
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
      <div className={`mt-1 text-sm font-bold tabular-nums ${color}`}>{value}</div>
      {under ? <div className="mt-1">{under}</div> : null}
    </div>
  );
}
