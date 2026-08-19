"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import AdminLink from "@/components/AdminLink";

export default function LandingPage() {
  const { t } = useI18n();
  const [hasPortfolio, setHasPortfolio] = useState(false);

  useEffect(() => {
    setHasPortfolio(!!loadPortfolio());
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="select-none text-[22vw] font-black leading-none tracking-[0.18em] text-terminal-accent/[0.07]">
          SNIPER
        </span>
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 42%, rgba(249,115,22,0.16), transparent 58%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Link
        href="/build"
        className="group relative select-none transition-transform duration-300 ease-smooth hover:-translate-y-0.5"
        aria-label="Build your portfolio"
      >
        <span className="glow block text-6xl font-black tracking-[0.28em] transition-transform duration-300 ease-smooth group-hover:scale-[1.03] sm:text-8xl">
          {t("brand.build")}
        </span>
        <span className="mt-5 block max-w-xs text-center text-sm tracking-[0.08em] text-terminal-muted">
          {t("landing.tagline")}
        </span>
      </Link>

      {hasPortfolio && (
        <Link
          href="/dashboard"
          className="absolute bottom-10 text-xs tracking-[0.28em] text-terminal-muted underline-offset-4 hover:text-terminal-accent hover:underline"
        >
          {t("landing.seePortfolio")}
        </Link>
      )}

      <div className="absolute top-0 start-0 end-0 z-50 flex items-start justify-between safe-pt safe-px">
        <div className="px-4 py-3 text-xs font-semibold tracking-[0.35em] text-terminal-accent">
          SNIPER
        </div>
        <div className="px-2 py-1">
          <AdminLink />
        </div>
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
