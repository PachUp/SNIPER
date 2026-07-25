"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/types";
import NewsPopup from "@/components/NewsPopup";
import { useI18n } from "@/components/LanguageProvider";

export default function NewsLine({ item }: { item: NewsItem }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const good = item.sentiment === "good";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-4 rounded-xl border-l-4 px-5 py-4 text-left transition-colors ${
          good
            ? "border-l-terminal-good border border-terminal-good/20 bg-terminal-good/[0.07] hover:bg-terminal-good/10"
            : "border-l-terminal-bad border border-terminal-bad/20 bg-terminal-bad/[0.07] hover:bg-terminal-bad/10"
        }`}
      >
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${
            good
              ? "bg-terminal-good/15 text-terminal-good"
              : "bg-terminal-bad/15 text-terminal-bad"
          }`}
        >
          {good ? t("newsline.good") : t("newsline.bad")}
        </span>
        <span className="flex-1 text-base text-terminal-text">{item.line}</span>
        <span className="shrink-0 text-[11px] text-terminal-muted">
          {t("newsline.details")}
        </span>
      </button>

      {open && <NewsPopup item={item} onClose={() => setOpen(false)} />}
    </>
  );
}
