"use client";

import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-10 border-t border-terminal-border px-4 py-6 text-center">
      <p className="mx-auto max-w-3xl text-[11px] leading-relaxed text-terminal-muted">
        {t("footer.disclaimer")}
      </p>
      <nav className="mt-3 flex justify-center gap-4 text-[11px]">
        <Link
          href="/legal/disclaimer"
          className="text-terminal-muted hover:text-terminal-accent"
        >
          {t("footer.disclaimerLink")}
        </Link>
        <Link
          href="/legal/terms"
          className="text-terminal-muted hover:text-terminal-accent"
        >
          {t("footer.terms")}
        </Link>
        <Link
          href="/legal/privacy"
          className="text-terminal-muted hover:text-terminal-accent"
        >
          {t("footer.privacy")}
        </Link>
      </nav>
    </footer>
  );
}
