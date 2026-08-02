"use client";

import type { Levels } from "@/lib/types";
import { formatR2r, hypoPlFromLevels, pct, r2rFromLevels } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

/** Clickable R2R that reveals hypothetical profit / loss % under the description. */
export default function R2rPlDetails({
  levels,
  open,
  onToggle,
  className = "",
}: {
  levels: Levels | undefined | null;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const ratio = r2rFromLevels(levels);
  const pl = hypoPlFromLevels(levels);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggle();
        }}
        className={`text-xs font-bold underline-offset-2 hover:underline ${
          (ratio ?? 0) >= 1.5 ? "text-terminal-good" : "text-terminal-accent"
        }`}
        title={t("common.r2rHint")}
        aria-expanded={open}
      >
        {t("common.r2r", { v: formatR2r(ratio) })}
      </button>
      {open && pl ? (
        <div className="mt-1.5 space-y-0.5 text-[12px] leading-snug">
          <p className="text-terminal-good">
            {t("common.hypoProfit", { v: pct(pl.profitPct) })}
          </p>
          <p className="text-terminal-bad">
            {t("common.hypoLoss", { v: pct(-pl.lossPct) })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
