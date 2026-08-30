"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadPortfolio } from "@/lib/clientPortfolio";
import { useI18n } from "@/components/LanguageProvider";
import AdminLink from "@/components/AdminLink";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setHasPortfolio(!!loadPortfolio());
    setReady(true);
  }, []);

  function go(href: string) {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      router.push(href);
    }, 60);
  }

  // Returning users: don't make the whole screen rebuild-on-tap.
  if (ready && hasPortfolio) {
    return (
      <main
        className={`relative flex min-h-screen-ios flex-col items-center justify-center overflow-hidden bg-black safe-pt safe-pb transition-opacity duration-200 ease-smooth ${
          exiting ? "opacity-0" : "opacity-100"
        }`}
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

        <div className="absolute top-0 start-0 end-0 z-50 flex items-start justify-between safe-pt safe-px">
          <div className="px-4 py-3 text-xs font-semibold tracking-[0.35em] text-terminal-accent">
            SNIPER
          </div>
          <div className="px-2 py-1">
            <AdminLink />
          </div>
        </div>

        <div
          className={`relative flex flex-col items-center px-4 transition-transform duration-300 ease-smooth ${
            exiting ? "scale-95" : "scale-100"
          }`}
        >
          <span className="glow text-5xl font-black tracking-[0.28em] sm:text-7xl">
            SNIPER
          </span>
          <p className="mt-5 max-w-sm text-center text-sm tracking-[0.06em] text-terminal-muted">
            {t("landing.returnTagline")}
          </p>
          <button
            type="button"
            onClick={() => go("/dashboard")}
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-terminal-accent px-10 py-3.5 text-sm font-bold tracking-[0.2em] text-black"
          >
            {t("landing.seePortfolio")}
          </button>
          <button
            type="button"
            onClick={() => go("/build")}
            className="mt-3 inline-flex min-h-11 items-center px-4 text-xs tracking-[0.22em] text-terminal-muted underline-offset-4"
          >
            {t("landing.buildNew")}
          </button>
        </div>

        {process.env.NEXT_PUBLIC_SOFT_LAUNCH === "1" && (
          <p className="pointer-events-none absolute bottom-4 max-w-md px-4 text-center text-[10px] leading-relaxed text-terminal-muted">
            {t("landing.softLaunch")}
          </p>
        )}
      </main>
    );
  }

  return (
    <main
      role="link"
      tabIndex={0}
      aria-label={t("landing.tapAnywhere")}
      onClick={() => go("/build")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go("/build");
        }
      }}
      className={`relative flex min-h-screen-ios cursor-pointer flex-col items-center justify-center overflow-hidden bg-black safe-pt safe-pb transition-opacity duration-200 ease-smooth ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
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

      <div
        className={`group relative select-none transition-transform duration-300 ease-smooth ${
          exiting ? "scale-95" : "scale-100"
        }`}
      >
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
          {t("landing.softLaunch")}
        </p>
      )}
    </main>
  );
}
