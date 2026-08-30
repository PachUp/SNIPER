"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import { storageGet, storageSet } from "@/lib/safeStorage";
import { useIosSheet } from "@/lib/useIosSheet";

const CONSENT_KEY = "sniper.consent.v1";
const PRELUDE_KEY = "sniper.prelude.v1";

const STEPS = [
  "prelude.s1",
  "prelude.s2",
  "prelude.s3",
  "prelude.s4",
  "prelude.s5",
] as const;

/** Short how-to shown once after consent — teaches the five core moves. */
export default function HowToPrelude() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function refresh() {
      const consented = storageGet(CONSENT_KEY) === "true";
      const seen = storageGet(PRELUDE_KEY) === "true";
      setShow(consented && !seen);
      setReady(true);
    }
    refresh();
    window.addEventListener("sniper:consent", refresh);
    return () => window.removeEventListener("sniper:consent", refresh);
  }, []);

  const excluded =
    pathname?.startsWith("/legal") || pathname?.startsWith("/admin");
  const open = ready && show && !excluded;
  useIosSheet(open);

  if (!open) return null;

  function dismiss() {
    storageSet(PRELUDE_KEY, "true");
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="ios-sheet max-w-md border border-terminal-border bg-terminal-panel px-5 pt-3 shadow-2xl sm:p-5">
        <div className="ios-grabber" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
          {t("prelude.eyebrow")}
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-wide">
          {t("prelude.title")}
        </h2>
        <p className="mt-1.5 text-sm text-terminal-muted">{t("prelude.body")}</p>

        <ol className="mt-4 space-y-2.5">
          {STEPS.map((key, i) => (
            <li key={key} className="flex gap-2.5 text-sm leading-snug">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terminal-accent/15 text-[11px] font-bold text-terminal-accent">
                {i + 1}
              </span>
              <span className="text-terminal-text">{t(key)}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 min-h-12 w-full rounded-xl bg-terminal-accent py-3 text-sm font-bold tracking-[0.18em] text-black"
        >
          {t("prelude.cta")}
        </button>
      </div>
    </div>
  );
}
