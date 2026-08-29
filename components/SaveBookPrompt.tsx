"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccounts } from "@/components/AccountsProvider";
import SignInModal from "@/components/SignInModal";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import {
  setCloudSyncEnabled,
  pushCloudNow,
} from "@/lib/user/syncClient";

/**
 * Always-available name save:
 * - Banner returns every visit (Later only hides until next navigation)
 * - Landing (/) always offers sign-in for guests — never permanently dismissed
 */
export default function SaveBookPrompt() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { enabled, user, loading, refresh, hydrateFromCloud } = useAccounts();
  const [showBanner, setShowBanner] = useState(false);
  const [modal, setModal] = useState(false);
  /** Session-only: "Later" hides banner until path changes / remount — never forever. */
  const [laterThisView, setLaterThisView] = useState(false);

  useEffect(() => {
    setLaterThisView(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setCloudSyncEnabled(true);
      void hydrateFromCloud().then(() => pushCloudNow());
      setShowBanner(false);
      setModal(false);
      return;
    }
    setCloudSyncEnabled(false);
    if (!enabled) {
      setShowBanner(false);
      return;
    }

    const hasBook = Boolean(loadPortfolio()?.holdings?.length);
    const onLanding = pathname === "/";
    const onYours =
      pathname === "/dashboard" || pathname?.startsWith("/dashboard");

    // Landing has its own always-on SIGN IN CTAs — don't stack a second modal.
    if (onLanding) {
      setShowBanner(false);
      return;
    }

    setShowBanner(hasBook && !laterThisView && onYours);
  }, [enabled, user, loading, pathname, hydrateFromCloud, laterThisView]);

  useEffect(() => {
    function onPortfolio() {
      void refresh();
      const hasBook = Boolean(loadPortfolio()?.holdings?.length);
      if (hasBook && enabled && !user) {
        setLaterThisView(false);
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
                  setLaterThisView(true);
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

      {/* Persistent guest entry when banner is hidden */}
      {!user && enabled && !showBanner && !modal && pathname !== "/" ? (
        <button
          type="button"
          onClick={() => setModal(true)}
          className="fixed bottom-16 end-3 z-40 rounded-full border border-terminal-accent/50 bg-terminal-accent px-4 py-2.5 text-[11px] font-bold tracking-[0.14em] text-black shadow-lg sm:bottom-6"
        >
          {t("auth.signIn")}
        </button>
      ) : null}

      <SignInModal
        open={modal && !user}
        reason={pathname === "/" ? "return" : "save"}
        onClose={() => setModal(false)}
      />
    </>
  );
}
