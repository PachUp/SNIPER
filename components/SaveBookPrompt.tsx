"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccounts } from "@/components/AccountsProvider";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import {
  setCloudSyncEnabled,
  pushCloudNow,
} from "@/lib/user/syncClient";

/**
 * Soft reminder only — name ask/validate happens on BUILD, not every stage.
 */
export default function SaveBookPrompt() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { enabled, user, loading, hydrateFromCloud } = useAccounts();
  const [showBanner, setShowBanner] = useState(false);
  const [laterThisView, setLaterThisView] = useState(false);

  useEffect(() => {
    setLaterThisView(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setCloudSyncEnabled(true);
      void hydrateFromCloud().then(() => {
        void pushCloudNow();
      });
      setShowBanner(false);
      return;
    }
    setCloudSyncEnabled(false);
    if (!enabled) {
      setShowBanner(false);
      return;
    }

    // Never nag on landing or build (build has its own name gate).
    if (pathname === "/" || pathname?.startsWith("/build")) {
      setShowBanner(false);
      return;
    }

    const hasBook = Boolean(loadPortfolio()?.holdings?.length);
    const onYours =
      pathname === "/dashboard" || pathname?.startsWith("/dashboard");
    setShowBanner(hasBook && !laterThisView && onYours && !user);
  }, [enabled, user, loading, pathname, hydrateFromCloud, laterThisView]);

  if (!showBanner || user) return null;

  return (
    <div className="fixed start-3 end-3 z-40 mx-auto max-w-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-terminal-accent/40 bg-terminal-panel/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <p className="text-[11px] leading-snug text-white/90">
          {t("auth.saveBannerBuild")}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setLaterThisView(true);
              setShowBanner(false);
            }}
            className="inline-flex min-h-11 items-center px-2 text-[10px] uppercase tracking-wider text-terminal-muted"
          >
            {t("auth.later")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/build")}
            className="inline-flex min-h-11 items-center rounded-md bg-terminal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black"
          >
            {t("brand.build")}
          </button>
        </div>
      </div>
    </div>
  );
}
