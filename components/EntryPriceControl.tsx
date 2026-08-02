"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";

/** Clickable EP: orange until set, then shining green. Saves to local storage via parent. */
export default function EditableEp({
  plannedEp,
  value,
  onSave,
}: {
  plannedEp: number;
  value: number | null;
  onSave: (price: number) => void;
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
        <span className="text-[9px] tracking-wider text-terminal-muted">
          {t("common.buy")}
        </span>
        <div className="flex items-center gap-0.5 px-1">
          <input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-[4.5rem] rounded border border-terminal-orange/60 bg-terminal-bg px-1 py-0.5 text-center text-[10px] text-terminal-text outline-none"
            aria-label={t("dash.enterPrice")}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              commit();
            }}
            className="rounded bg-terminal-orange px-1.5 py-0.5 text-[9px] font-bold text-black"
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
      className={`w-full rounded py-1 text-[10px] transition ${
        locked
          ? "animate-shine bg-terminal-good/20 font-bold text-terminal-good ring-1 ring-terminal-good/50"
          : "bg-terminal-panel text-terminal-orange ring-1 ring-terminal-orange/40 hover:bg-terminal-orange/10"
      }`}
    >
      {t("common.buy")} {money(display)}
    </button>
  );
}
