"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccounts } from "@/components/AccountsProvider";
import SignInModal from "@/components/SignInModal";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { storageGet, storageSet } from "@/lib/safeStorage";
import { useI18n } from "@/components/LanguageProvider";
import {
  setCloudSyncEnabled,
  pushCloudNow,
} from "@/lib/user/syncClient";

const SAVE_PROMPT_KEY = "sniper.savePrompt.v1";

/** Soft “Save my book” after BUILD / on return when guest has a portfolio. */
export default function SaveBookPrompt() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { enabled, user, loading, refresh, hydrateFromCloud } = useAccounts();
  const [showBanner, setShowBanner] = useState(false);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setCloudSyncEnabled(true);
      void hydrateFromCloud().then(() => pushCloudNow());
      setShowBanner(false);
      return;
    }
    setCloudSyncEnabled(false);
    if (!enabled) {
      setShowBanner(false);
      return;
    }
    const hasBook = Boolean(loadPortfolio()?.holdings?.length);
    const dismissed = storageGet(SAVE_PROMPT_KEY) === "true";
    const onYoursOrHome =
      pathname === "/" ||
      pathname === "/dashboard" ||
      pathname?.startsWith("/dashboard");
    setShowBanner(hasBook && !dismissed && onYoursOrHome);
  }, [enabled, user, loading, pathname, hydrateFromCloud]);

  useEffect(() => {
    function onPortfolio() {
      void refresh();
      const hasBook = Boolean(loadPortfolio()?.holdings?.length);
      if (hasBook && enabled && !user && storageGet(SAVE_PROMPT_KEY) !== "true") {
        setShowBanner(true);
        setModal(true);
      }
    }
    window.addEventListener("sniper:portfolio", onPortfolio);
    return () => window.removeEventListener("sniper:portfolio", onPortfolio);
  }, [enabled, user, refresh]);

  if (!enabled && !modal) return null;

  return (
    <>
      {showBanner && !user ? (
        <div className="fixed bottom-16 start-3 end-3 z-40 mx-auto max-w-lg sm:bottom-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-terminal-accent/40 bg-terminal-panel/95 px-3 py-2.5 shadow-lg backdrop-blur">
            <p className="text-[11px] leading-snug text-white/90">
              {t("auth.saveBanner")}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  storageSet(SAVE_PROMPT_KEY, "true");
                  setShowBanner(false);
                }}
                className="text-[10px] uppercase tracking-wider text-terminal-muted"
              >
                {t("auth.later")}
              </button>
              <button
                type="button"
                onClick={() => setModal(true)}
                className="rounded-md bg-terminal-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black"
              >
                {t("auth.saveCta")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SignInModal
        open={modal}
        reason={pathname === "/" ? "return" : "save"}
        onClose={() => {
          setModal(false);
          storageSet(SAVE_PROMPT_KEY, "true");
          setShowBanner(false);
        }}
      />
    </>
  );
}
