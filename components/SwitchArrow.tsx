"use client";

import type { Stock } from "@/lib/types";
import { useI18n } from "@/components/LanguageProvider";

/**
 * Horizontal switch (`<` / `>`) to move an AI-picked holding to an
 * admin-approved alternative in the SAME sector with slightly higher/lower
 * beta. Left = lower beta / less risky. Right = higher beta / more upside.
 */
export default function SwitchArrow({
  pool,
  currentTicker,
  onSwitch,
}: {
  pool: Stock[];
  currentTicker: string;
  onSwitch: (ticker: string) => void;
}) {
  const { t } = useI18n();
  const idx = pool.findIndex((s) => s.ticker === currentTicker);
  const canLeft = idx > 0;
  const canRight = idx >= 0 && idx < pool.length - 1;

  if (pool.length <= 1) return null;

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      title={t("switch.title")}
    >
      <button
        disabled={!canLeft}
        onClick={() => canLeft && onSwitch(pool[idx - 1].ticker)}
        className="flex h-6 w-6 items-center justify-center rounded border border-terminal-border text-terminal-muted transition-colors hover:border-terminal-good hover:text-terminal-good disabled:cursor-not-allowed disabled:opacity-25"
        aria-label={t("switch.saferAria")}
        title={t("switch.saferTitle")}
      >
        ‹
      </button>
      <span className="text-[9px] tracking-wider text-terminal-muted">
        {idx + 1}/{pool.length}
      </span>
      <button
        disabled={!canRight}
        onClick={() => canRight && onSwitch(pool[idx + 1].ticker)}
        className="flex h-6 w-6 items-center justify-center rounded border border-terminal-border text-terminal-muted transition-colors hover:border-terminal-accent hover:text-terminal-accent disabled:cursor-not-allowed disabled:opacity-25"
        aria-label={t("switch.bolderAria")}
        title={t("switch.bolderTitle")}
      >
        ›
      </button>
    </div>
  );
}
