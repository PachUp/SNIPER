"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import { storageGet, storageSet } from "@/lib/safeStorage";
import { useIosSheet } from "@/lib/useIosSheet";

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

  const excluded =
    pathname?.startsWith("/legal") || pathname?.startsWith("/admin");
  const show = ready && !accepted && !excluded;
  useIosSheet(show);

  if (!show) return null;

  function accept() {
    storageSet(CONSENT_KEY, "true");
    setAccepted(true);
    window.dispatchEvent(new Event("sniper:consent"));
  }

  const canAccept = isAdult && ackAdvice;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center sm:p-4">
      <div className="ios-sheet max-w-md border border-terminal-border bg-terminal-panel px-5 pt-3 shadow-2xl sm:p-6">
        <div className="ios-grabber" />
        <h2 className="text-lg font-bold tracking-wide">
          {t("consent.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-terminal-muted">
          {t("consent.body")}
        </p>

        <label className="mt-4 flex min-h-12 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 accent-[#f97316]"
          />
          <span>{t("consent.adult")}</span>
        </label>

        <label className="mt-3 flex min-h-12 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={ackAdvice}
            onChange={(e) => setAckAdvice(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 accent-[#f97316]"
          />
          <span>
            {t("consent.ackPre")}
            <Link
              href="/legal/terms"
              className="inline-flex min-h-11 items-center text-terminal-accent underline underline-offset-2"
            >
              {t("consent.terms")}
            </Link>
            {t("consent.sep")}
            <Link
              href="/legal/privacy"
              className="inline-flex min-h-11 items-center text-terminal-accent underline underline-offset-2"
            >
              {t("consent.privacy")}
            </Link>
            {t("consent.and")}
            <Link
              href="/legal/disclaimer"
              className="inline-flex min-h-11 items-center text-terminal-accent underline underline-offset-2"
            >
              {t("consent.disclaimer")}
            </Link>
            {t("consent.ackPost")}
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!canAccept}
          className="mt-5 min-h-12 w-full rounded-xl bg-terminal-accent py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg disabled:opacity-40"
        >
          {t("consent.cta")}
        </button>
        <p className="mt-3 text-center text-[10px] text-terminal-muted">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center tracking-[0.2em] text-terminal-muted underline-offset-2"
          >
            ADMIN
          </Link>
        </p>
      </div>
    </div>
  );
}
