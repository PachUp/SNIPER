"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BuiltPortfolio } from "@/lib/types";
import { MAX_USER_PICKS, MIN_USER_PICKS } from "@/lib/portfolio";
import { savePortfolio } from "@/lib/clientPortfolio";
import { formatR2r, r2rFromLevels } from "@/lib/format";
import { useI18n } from "@/components/LanguageProvider";
import ReasoningPopup from "@/components/ReasoningPopup";
import CompactStockRow from "@/components/CompactStockRow";
import TickerLogo from "@/components/TickerLogo";
import AdminLink from "@/components/AdminLink";
import type { FamousListResult, FamousPick } from "@/lib/builder/map";
import type { Stock } from "@/lib/types";

export default function BuildPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [famous, setFamous] = useState<FamousListResult | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Stock | null>(null);

  useEffect(() => {
    fetch("/api/builder/famous")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load famous picks");
        return data as FamousListResult;
      })
      .then((data) => {
        setFamous(data);
        // Warm static logo assets for every famous name.
        for (const p of data.picks ?? []) {
          const img = new Image();
          img.src = `/logos/${encodeURIComponent(p.symbol)}.png?v=native`;
        }
      })
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

  const allPicks = useMemo(() => famous?.picks ?? [], [famous]);

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
    <main className="mx-auto min-h-screen max-w-6xl bg-black px-4 py-8">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.35em] text-terminal-accent"
          >
            SNIPER
          </Link>
          <button
            type="button"
            onClick={() => void build()}
            disabled={building || picked.length < MIN_USER_PICKS}
            className="rounded-md bg-terminal-accent px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-black disabled:opacity-40"
          >
            {building ? t("build.buildingCta") : t("build.buildMine")}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-terminal-accent/30 bg-terminal-accent/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-terminal-accent">
            {t("build.chosen", { n: picked.length, max: MAX_USER_PICKS })}
          </div>
          <AdminLink />
        </div>
      </header>

      <h1 className="text-2xl font-bold tracking-wide text-white sm:text-3xl">
        {t("build.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-terminal-muted">
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
      ) : (
        <>
          {/* Brand wall — every famous logo, first impression */}
          {allPicks.length > 0 ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-terminal-border bg-gradient-to-b from-[#141414] to-black p-5 shadow-[0_0_60px_rgba(249,115,22,0.08)]">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terminal-accent">
                    Famous names
                  </p>
                  <p className="mt-1 text-sm text-terminal-muted">
                    Tap a card below to shortlist — logos stay front and center.
                  </p>
                </div>
                <span className="text-[11px] text-terminal-muted">
                  {allPicks.length} brands
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {allPicks.map((p) => {
                  const on = picked.includes(p.symbol);
                  return (
                    <button
                      key={`wall-${p.symbol}`}
                      type="button"
                      disabled={
                        !p.eligible ||
                        (!on && picked.length >= MAX_USER_PICKS)
                      }
                      onClick={() => p.eligible && toggle(p.symbol)}
                      className={`group relative rounded-2xl p-1.5 transition-all duration-300 ease-smooth ${
                        on
                          ? "scale-105 bg-terminal-accent/15"
                          : p.eligible
                            ? "hover:scale-105 hover:bg-white/5"
                            : "opacity-45 grayscale"
                      }`}
                      title={p.name || p.symbol}
                    >
                      <TickerLogo
                        symbol={p.symbol}
                        size={52}
                        priority
                        ring={on}
                      />
                      {on ? (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terminal-accent text-[10px] font-black text-black shadow-lg">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {eligiblePicks.length === 0 ? (
            <div className="mt-10 text-center text-sm text-terminal-muted">
              {t("build.noneEligible")}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {eligiblePicks.map((p) => {
                const on = picked.includes(p.symbol);
                const blocked = !on && picked.length >= MAX_USER_PICKS;
                return (
                  <div
                    key={p.symbol}
                    className={`flex items-center gap-1 rounded-md ${
                      on ? "ring-1 ring-terminal-accent/50" : ""
                    } ${blocked ? "opacity-40" : ""}`}
                  >
                    <CompactStockRow
                      ticker={p.symbol}
                      name={p.name || p.sector || undefined}
                      badge={
                        on
                          ? "ON"
                          : typeof p.upside_pct === "number"
                            ? `${p.upside_pct >= 0 ? "+" : ""}${p.upside_pct.toFixed(0)}%`
                            : undefined
                      }
                      onClick={() => setDetail(famousPickToStock(p))}
                      className="min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => toggle(p.symbol)}
                      className={`shrink-0 rounded-md px-2 py-1.5 text-[10px] font-bold tracking-wider ${
                        on
                          ? "bg-terminal-accent text-black"
                          : "border border-terminal-border text-terminal-accent"
                      }`}
                    >
                      {on ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {ineligiblePicks.length > 0 && (
            <div className="mt-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-terminal-muted">
                {t("build.notEligibleToday")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {ineligiblePicks.map((p) => (
                  <span
                    key={p.symbol}
                    className="inline-flex items-center gap-2.5 rounded-2xl border border-terminal-border bg-[#0c0c0c] px-3 py-2 text-xs text-terminal-muted"
                    title={p.reason ?? undefined}
                  >
                    <TickerLogo symbol={p.symbol} size={28} priority />
                    <span>
                      <span className="font-semibold text-white/80">
                        {p.symbol}
                      </span>
                      {p.levels
                        ? ` · ${formatR2r(r2rFromLevels(p.levels))}`
                        : ""}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="sticky bottom-4 mt-8 flex justify-center">
        <button
          onClick={() => void build()}
          disabled={building || picked.length < MIN_USER_PICKS}
          className="rounded-full bg-terminal-accent px-12 py-3.5 text-sm font-bold tracking-[0.22em] text-black shadow-[0_0_40px_rgba(249,115,22,0.35)] transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_56px_rgba(249,115,22,0.5)] disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {building ? t("build.buildingCta") : t("build.buildMine")}
        </button>
      </div>

      {detail ? (
        <ReasoningPopup
          stock={detail}
          onClose={() => setDetail(null)}
          extras={
            <button
              type="button"
              disabled={
                !picked.includes(detail.ticker) &&
                picked.length >= MAX_USER_PICKS
              }
              onClick={() => {
                toggle(detail.ticker);
              }}
              className="w-full rounded-md bg-terminal-accent py-2 text-xs font-bold tracking-[0.14em] text-black disabled:opacity-40"
            >
              {picked.includes(detail.ticker)
                ? "REMOVE FROM PICKS"
                : "ADD TO PICKS"}
            </button>
          }
        />
      ) : null}
    </main>
  );
}

function famousPickToStock(p: FamousPick): Stock {
  const levels = p.levels ?? { ep: 0, tp: 0, sl: 0 };
  return {
    ticker: p.symbol,
    name: p.name || p.symbol,
    sector: (p.sector as Stock["sector"]) || "Information Technology",
    industry: p.industry,
    price: levels.ep,
    fairValue: levels.tp,
    upsidePct: typeof p.upside_pct === "number" ? p.upside_pct : 0,
    beta: p.beta ?? 1,
    sharpe: 0,
    business: p.business,
    reasoning: p.reasoning || "",
    numbers: p.numbers,
    levels,
    alternatives: [],
  };
}
