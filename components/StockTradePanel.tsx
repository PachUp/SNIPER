"use client";

import type { ReactNode } from "react";
import type { Stock } from "@/lib/types";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import TickerLogo from "@/components/TickerLogo";
import SinceEntryBadge from "@/components/SinceEntryBadge";
import LevelInfo from "@/components/LevelInfo";

function shortThesis(text: string, max = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

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
  const thesis = shortThesis(stock.reasoning || stock.business || "");
  const px =
    livePrice != null && Number.isFinite(livePrice) ? livePrice : stock.price;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border border-terminal-border bg-terminal-panel p-2.5 text-left transition hover:border-terminal-accent/40"
    >
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
              <span
                className="ms-auto flex shrink-0 items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
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
          control={buyControl}
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

      {thesis ? (
        <p className="line-clamp-2 text-[11px] leading-snug text-white/75">
          {thesis}{" "}
          <span className="text-terminal-accent/80">{t("panel.tapMore")}</span>
        </p>
      ) : (
        <p className="text-[11px] text-terminal-muted">{t("panel.tapMore")}</p>
      )}
    </button>
  );
}

function LevelCell({
  tip,
  label,
  value,
  tone,
  control,
}: {
  tip: string;
  label: string;
  value: string;
  tone: "accent" | "good" | "bad";
  control?: ReactNode;
}) {
  const color =
    tone === "good"
      ? "text-terminal-good"
      : tone === "bad"
        ? "text-terminal-bad"
        : "text-terminal-accent";

  return (
    <div
      className="rounded-lg border border-terminal-border bg-black/40 px-1.5 py-1.5 text-center"
      onClick={(e) => {
        if (control) e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-center gap-1">
        <LevelInfo tip={tip} />
        <span className="text-[9px] tracking-wider text-terminal-muted">
          {label}
        </span>
      </div>
      {control ? (
        <div className="mt-1">{control}</div>
      ) : (
        <div className={`mt-1 text-xs font-bold ${color}`}>{value}</div>
      )}
    </div>
  );
}
