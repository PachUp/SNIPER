"use client";

import { useI18n } from "@/components/LanguageProvider";

/** Opens the in-app password-protected admin desk (works on phone + desktop). */
export default function AdminLink({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <a
      href="/admin"
      className={`relative z-50 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md px-3 py-2 text-xs tracking-[0.28em] text-terminal-muted transition-colors hover:text-terminal-accent active:bg-terminal-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-accent ${className}`}
      aria-label="Admin login"
    >
      {t("nav.admin")}
    </a>
  );
}
