"use client";

import { useI18n } from "@/components/LanguageProvider";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { t, toggle } = useI18n();
  return (
    <button
      onClick={toggle}
      className={`rounded-md border border-terminal-border px-2 py-1 text-xs tracking-[0.15em] text-terminal-muted transition-colors hover:border-terminal-accent hover:text-terminal-accent ${className}`}
      aria-label="Switch language"
    >
      {t("lang.switchTo")}
    </button>
  );
}
