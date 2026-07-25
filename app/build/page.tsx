"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BuiltPortfolio } from "@/lib/types";
import { MAX_USER_PICKS, MIN_USER_PICKS } from "@/lib/portfolio";
import { savePortfolio } from "@/lib/clientPortfolio";
import { pct, riskColorClass } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";
import type { FamousListResult, FamousPick } from "@/lib/builder/map";

export default function BuildPage() {
  const router = useRouter();
  const { t, risk } = useI18n();
  const [famous, setFamous] = useState<FamousListResult | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/builder/famous")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load famous picks");
        return data as FamousListResult;
      })
      .then((data) => setFamous(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const eligiblePicks = useMemo(
    () => (famous?.picks ?? []).filter((p) => p.eligible),
    [famous]
  );

  const ineligiblePicks = useMemo(
    () => (famous?.picks ?? []).filter((p) => !p.eligible),
    [famous]
  );

  function toggle(symbol: string) {
    setError(null);
    setPicked((prev) => {
      if (prev.includes(symbol)) return prev.filter((t) => t !== symbol);
      if (prev.length >= MAX_USER_PICKS) return prev;
      return [...prev, symbol];
    });
  }

  async function build() {
    if (picked.length < MIN_USER_PICKS) {
      setError(t("build.needPick", { min: MIN_USER_PICKS }));
      return;
    }
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("build.failed"));
      }
      savePortfolio(data as BuiltPortfolio);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("build.failed"));
      setBuilding(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs tracking-[0.35em] text-terminal-muted hover:text-terminal-accent"
        >
          {t("build.back")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-xs tracking-[0.3em] text-terminal-muted">
            {t("build.chosen", { n: picked.length, max: MAX_USER_PICKS })}
          </div>
          <LangToggle />
        </div>
      </header>

      <h1 className="text-2xl font-bold tracking-wide">{t("build.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-terminal-muted">
        {t("build.subtitle", {
          max: MAX_USER_PICKS,
          minUpside: famous?.famous_min_upside_pct ?? 20,
        })}
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-terminal-bad/40 bg-terminal-bad/10 px-4 py-3 text-sm text-terminal-bad">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-center text-terminal-muted">
          {t("common.loading")}
        </div>
      ) : eligiblePicks.length === 0 ? (
        <div className="mt-10 text-center text-sm text-terminal-muted">
          {t("build.noneEligible")}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eligiblePicks.map((p) => (
              <FamousCard
                key={p.symbol}
                pick={p}
                isPicked={picked.includes(p.symbol)}
                disabled={
                  !picked.includes(p.symbol) && picked.length >= MAX_USER_PICKS
                }
                onToggle={() => toggle(p.symbol)}
                potentialLabel={t("common.potential", {
                  v: pct(p.upside_pct ?? 0),
                })}
                riskLabel={t("common.riskSuffix", {
                  level: risk(p.beta ?? 1),
                })}
                riskClass={riskColorClass(p.beta ?? 1)}
              />
            ))}
          </div>

          {ineligiblePicks.length > 0 && (
            <div className="mt-8">
              <p className="text-xs tracking-[0.2em] text-terminal-muted">
                {t("build.notEligibleToday")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ineligiblePicks.map((p) => (
                  <span
                    key={p.symbol}
                    className="rounded-full border border-terminal-border px-3 py-1 text-xs text-terminal-muted opacity-60"
                    title={p.reason ?? undefined}
                  >
                    {p.symbol}
                    {p.upside_pct != null ? ` ${pct(p.upside_pct)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="sticky bottom-4 mt-8 flex justify-center">
        <button
          onClick={build}
          disabled={building || picked.length < MIN_USER_PICKS}
          className="rounded-full bg-terminal-accent px-10 py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg shadow-lg shadow-terminal-accent/20 transition-transform hover:scale-105 disabled:opacity-50"
        >
          {building ? t("build.buildingCta") : t("build.buildMine")}
        </button>
      </div>
    </main>
  );
}

function FamousCard({
  pick,
  isPicked,
  disabled,
  onToggle,
  potentialLabel,
  riskLabel,
  riskClass,
}: {
  pick: FamousPick;
  isPicked: boolean;
  disabled: boolean;
  onToggle: () => void;
  potentialLabel: string;
  riskLabel: string;
  riskClass: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`rounded-lg border p-4 text-left transition-all ${
        isPicked
          ? "border-terminal-accent bg-terminal-accent/10"
          : "border-terminal-border bg-terminal-panel hover:border-terminal-accent/40"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{pick.symbol}</span>
        <span className="text-xs text-terminal-good">{potentialLabel}</span>
      </div>
      <div className="mt-0.5 truncate text-sm text-terminal-muted">
        {pick.sector || pick.industry || "—"}
      </div>
      <div className="mt-2 text-[11px]">
        <span className={riskClass}>{riskLabel}</span>
      </div>
    </button>
  );
}
