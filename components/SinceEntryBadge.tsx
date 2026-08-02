"use client";

import { money, pct } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

type Props = {
  value: number | null;
  livePrice?: number | null;
  /** compact = header chip; row = full-width bar; hero = chart callout */
  variant?: "compact" | "row" | "hero";
  /** When false, compact/hero render nothing if value is missing */
  showEmpty?: boolean;
  className?: string;
};

/**
 * Professional since-entry P/L chip — terminal panel, tight type, green/red signal.
 */
export default function SinceEntryBadge({
  value,
  livePrice,
  variant = "row",
  showEmpty = true,
  className = "",
}: Props) {
  const { t } = useI18n();
  const has = value != null && Number.isFinite(value);
  const up = has && value! >= 0;
  const tone = !has
    ? "border-terminal-border"
    : up
      ? "border-l-terminal-good"
      : "border-l-terminal-bad";

  if (variant === "compact") {
    if (!has) {
      if (!showEmpty) return null;
      return (
        <span
          className={`inline-flex items-center rounded border border-terminal-accent/30 bg-black/70 px-2 py-[3px] text-[9px] font-medium uppercase tracking-[0.14em] text-terminal-accent ${className}`}
        >
          {t("dash.sinceEntryNeed")}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center rounded border border-terminal-border border-l-2 bg-black/80 px-2 py-[3px] text-[12px] font-semibold tabular-nums tracking-tight ${tone} ${
          up ? "text-terminal-good" : "text-terminal-bad"
        } ${className}`}
        title={t("dash.sinceEntry")}
      >
        {pct(value!)}
      </span>
    );
  }

  if (variant === "hero") {
    if (!has) return null;
    return (
      <div
        className={`mt-2.5 inline-flex min-w-[10rem] flex-col gap-1 rounded-md border border-terminal-border border-l-2 bg-black/85 px-3 py-2.5 ${tone} ${className}`}
      >
        <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-terminal-muted">
          {t("dash.sinceEntry")}
        </span>
        <span
          className={`text-[1.65rem] font-semibold leading-none tabular-nums tracking-tight ${
            up ? "text-terminal-good" : "text-terminal-bad"
          }`}
        >
          {pct(value!)}
        </span>
      </div>
    );
  }

  // row
  return (
    <div
      className={`mt-2 flex items-center justify-between gap-3 rounded-md border border-terminal-border border-l-2 bg-black/70 px-3 py-2.5 ${tone} ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-terminal-muted">
          {t("dash.sinceEntry")}
        </span>
        {livePrice != null && Number.isFinite(livePrice) ? (
          <span className="text-[10px] tabular-nums text-white/40">
            {t("dash.live")} {money(livePrice)}
          </span>
        ) : null}
      </div>
      {has ? (
        <span
          className={`text-base font-semibold tabular-nums tracking-tight ${
            up ? "text-terminal-good" : "text-terminal-bad"
          }`}
        >
          {pct(value!)}
        </span>
      ) : showEmpty ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-terminal-accent">
          {t("dash.sinceEntryNeed")}
        </span>
      ) : (
        <span className="text-[12px] text-terminal-muted">—</span>
      )}
    </div>
  );
}
