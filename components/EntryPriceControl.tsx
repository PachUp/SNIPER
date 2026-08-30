"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import LevelInfo from "@/components/LevelInfo";

/** Clickable EP: orange until set, then shining green. Saves to local storage via parent. */
export default function EditableEp({
  plannedEp,
  value,
  onSave,
  /** Panel cell already shows Buy around + (i) — only show the price. */
  priceOnly = false,
}: {
  plannedEp: number;
  value: number | null;
  onSave: (price: number) => void;
  priceOnly?: boolean;
}) {
  const { t } = useI18n();
  const locked = value != null && Number.isFinite(value) && value > 0;
  const display = locked ? value! : plannedEp;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(display || ""));

  function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0) return;
    onSave(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 rounded bg-terminal-panel py-1"
        onClick={(e) => e.stopPropagation()}
      >
        {!priceOnly ? (
          <div className="flex items-center gap-1">
            <LevelInfo tip={t("level.epTip")} />
            <span className="text-[9px] tracking-wider text-terminal-muted">
              {t("common.buy")}
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-0.5 px-0.5">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full min-w-[4.5rem] min-h-11 rounded border border-terminal-orange/60 bg-terminal-bg px-1.5 py-1.5 text-center text-base text-terminal-text outline-none sm:min-h-0 sm:text-[10px]"
            aria-label={t("dash.enterPrice")}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              commit();
            }}
            className="inline-flex min-h-11 shrink-0 items-center rounded bg-terminal-orange px-2 py-1.5 text-[11px] font-bold text-black sm:min-h-0 sm:text-[9px]"
          >
            {t("dash.enterSet")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setDraft(String(display || ""));
        setEditing(true);
      }}
      title={t("dash.enterEdit")}
      className={`flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] transition ${
        locked
          ? "animate-shine bg-terminal-good/20 font-bold text-terminal-good ring-1 ring-terminal-good/50"
          : "bg-terminal-panel text-terminal-orange ring-1 ring-terminal-orange/40 hover:bg-terminal-orange/10"
      }`}
    >
      {!priceOnly ? <LevelInfo tip={t("level.epTip")} /> : null}
      <span>
        {priceOnly ? money(display) : `${t("common.buy")} ${money(display)}`}
      </span>
    </button>
  );
}
