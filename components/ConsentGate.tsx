"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";

const CONSENT_KEY = "sniper.consent.v1";

export default function ConsentGate() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [isAdult, setIsAdult] = useState(false);
  const [ackAdvice, setAckAdvice] = useState(false);

  useEffect(() => {
    setAccepted(localStorage.getItem(CONSENT_KEY) === "true");
    setReady(true);
  }, []);

  // Don't gate the legal pages (users must be able to read them).
  const excluded = pathname?.startsWith("/legal");

  if (!ready || accepted || excluded) return null;

  function accept() {
    localStorage.setItem(CONSENT_KEY, "true");
    setAccepted(true);
  }

  const canAccept = isAdult && ackAdvice;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-panel p-6 shadow-2xl">
        <h2 className="text-lg font-bold tracking-wide">
          {t("consent.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-terminal-muted">
          {t("consent.body")}
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#22d3ee]"
          />
          <span>{t("consent.adult")}</span>
        </label>

        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={ackAdvice}
            onChange={(e) => setAckAdvice(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#22d3ee]"
          />
          <span>
            {t("consent.ackPre")}
            <Link
              href="/legal/terms"
              className="text-terminal-accent underline underline-offset-2"
            >
              {t("consent.terms")}
            </Link>
            {t("consent.sep")}
            <Link
              href="/legal/privacy"
              className="text-terminal-accent underline underline-offset-2"
            >
              {t("consent.privacy")}
            </Link>
            {t("consent.and")}
            <Link
              href="/legal/disclaimer"
              className="text-terminal-accent underline underline-offset-2"
            >
              {t("consent.disclaimer")}
            </Link>
            {t("consent.ackPost")}
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!canAccept}
          className="mt-5 w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.2em] text-terminal-bg disabled:opacity-40"
        >
          {t("consent.cta")}
        </button>
      </div>
    </div>
  );
}
