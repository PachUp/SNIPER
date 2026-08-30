"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import { storageGet, storageSet } from "@/lib/safeStorage";

const CONSENT_KEY = "sniper.consent.v1";

export default function ConsentGate() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [isAdult, setIsAdult] = useState(false);
  const [ackAdvice, setAckAdvice] = useState(false);

  useEffect(() => {
    setAccepted(storageGet(CONSENT_KEY) === "true");
    setReady(true);
  }, []);

  // Don't gate legal pages or the password-protected admin desk.
  const excluded =
    pathname?.startsWith("/legal") || pathname?.startsWith("/admin");

  if (!ready || accepted || excluded) return null;

  function accept() {
    storageSet(CONSENT_KEY, "true");
    setAccepted(true);
    window.dispatchEvent(new Event("sniper:consent"));
  }

  const canAccept = isAdult && ackAdvice;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center safe-pt">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto scroll-touch rounded-xl border border-terminal-border bg-terminal-panel p-6 shadow-2xl">
        <h2 className="text-lg font-bold tracking-wide">
          {t("consent.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-terminal-muted">
          {t("consent.body")}
        </p>

        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#f97316]"
          />
          <span>{t("consent.adult")}</span>
        </label>

        <label className="mt-3 flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={ackAdvice}
            onChange={(e) => setAckAdvice(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#f97316]"
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
          className="mt-5 min-h-11 w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.2em] text-terminal-bg disabled:opacity-40"
        >
          {t("consent.cta")}
        </button>
        <p className="mt-3 text-center text-[10px] text-terminal-muted">
          <Link
            href="/admin"
            className="tracking-[0.2em] text-terminal-muted underline-offset-2 hover:text-terminal-accent hover:underline"
          >
            ADMIN
          </Link>
        </p>
      </div>
    </div>
  );
}
