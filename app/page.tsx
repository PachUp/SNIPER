"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";

export default function LandingPage() {
  const { t } = useI18n();
  const [hasPortfolio, setHasPortfolio] = useState(false);

  useEffect(() => {
    setHasPortfolio(!!loadPortfolio());
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(34,211,238,0.10), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <Link
        href="/build"
        className="group relative select-none"
        aria-label="Build your portfolio"
      >
        <span className="glow block text-6xl font-black tracking-[0.3em] text-terminal-text transition-transform duration-200 group-hover:scale-105 sm:text-8xl">
          {t("brand.build")}
        </span>
        <span className="mt-5 block max-w-xs text-center text-sm text-terminal-muted">
          {t("landing.tagline")}
        </span>
      </Link>

      {hasPortfolio && (
        <Link
          href="/dashboard"
          className="absolute bottom-10 text-xs tracking-[0.3em] text-terminal-muted underline-offset-4 hover:text-terminal-accent hover:underline"
        >
          {t("landing.seePortfolio")}
        </Link>
      )}

      <div className="absolute top-6 start-6 text-xs tracking-[0.35em] text-terminal-muted">
        SNIPER
      </div>
      <div className="absolute top-6 end-6">
        <LangToggle />
      </div>

      {process.env.NEXT_PUBLIC_SOFT_LAUNCH === "1" && (
        <p className="absolute bottom-4 max-w-md px-4 text-center text-[10px] leading-relaxed text-terminal-muted">
          Friends / testers only · draft product · not investment advice · your
          portfolio is saved in this browser only
        </p>
      )}
    </main>
  );
}
