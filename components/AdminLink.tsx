"use client";

import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";

/** Opens the in-app password-protected admin desk. */
export default function AdminLink({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      href="/admin"
      className={`relative z-50 cursor-pointer rounded-md px-2 py-1 text-xs tracking-[0.35em] text-terminal-muted transition-colors hover:text-terminal-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-accent ${className}`}
      aria-label="Admin login"
    >
      {t("nav.admin")}
    </Link>
  );
}
