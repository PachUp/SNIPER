"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import AdminLink from "@/components/AdminLink";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [hasPortfolio, setHasPortfolio] = useState(false);

  useEffect(() => {
    setHasPortfolio(!!loadPortfolio());
  }, []);

  function startBuild() {
    router.push("/build");
  }

  return (
    <main
      role="link"
      tabIndex={0}
      aria-label="Tap anywhere to build your portfolio"
      onClick={startBuild}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startBuild();
        }
      }}
      className="relative flex min-h-[100dvh] cursor-pointer flex-col items-center justify-center overflow-hidden bg-black safe-pt safe-pb"
    >
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

      <div className="group relative select-none transition-transform duration-300 ease-smooth">
        <span className="glow block text-6xl font-black tracking-[0.28em] transition-transform duration-300 ease-smooth group-active:scale-[1.03] sm:text-8xl">
          {t("brand.build")}
        </span>
        <span className="mt-5 block max-w-xs text-center text-sm tracking-[0.08em] text-terminal-muted">
          {t("landing.tagline")}
        </span>
        <span className="mt-3 block text-center text-[11px] tracking-[0.22em] text-terminal-muted/80">
          {t("landing.tapAnywhere")}
        </span>
      </div>

      {hasPortfolio && (
        <Link
          href="/dashboard"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-10 z-20 text-xs tracking-[0.28em] text-terminal-muted underline-offset-4 hover:text-terminal-accent hover:underline"
        >
          {t("landing.seePortfolio")}
        </Link>
      )}

      <div
        className="absolute top-0 start-0 end-0 z-50 flex items-start justify-between safe-pt safe-px"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 text-xs font-semibold tracking-[0.35em] text-terminal-accent">
          SNIPER
        </div>
        <div className="px-2 py-1">
          <AdminLink />
        </div>
      </div>

      {process.env.NEXT_PUBLIC_SOFT_LAUNCH === "1" && (
        <p className="pointer-events-none absolute bottom-4 max-w-md px-4 text-center text-[10px] leading-relaxed text-terminal-muted">
          Friends / testers only · draft product · not investment advice · your
          portfolio is saved in this browser only
        </p>
      )}
    </main>
  );
}
