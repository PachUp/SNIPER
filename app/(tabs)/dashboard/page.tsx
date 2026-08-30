"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  BuiltPortfolio,
  GicsSector,
  PortfolioHolding,
  Stock,
} from "@/lib/types";
import {
  loadPortfolio,
  loadSwaps,
  saveSwap,
  clearSwap,
  clearPortfolio,
  loadEntries,
  loadEntryDates,
  saveEntry,
  loadRemoved,
  saveRemoved,
  loadAdded,
  saveAdded,
  loadReplaceStack,
  pushReplace,
  popReplace,
  pickStockToEliminate,
  MAX_PERSONAL_ADDS,
  type ReplaceRecord,
} from "@/lib/clientPortfolio";
import { levelsWithUserEntry } from "@/lib/format";
import { stockFromHolding } from "@/lib/builder/map";
import PerformanceChart from "@/components/PerformanceChart";
import PortfolioRiskPanel from "@/components/PortfolioRiskPanel";
import ReasoningPopup from "@/components/ReasoningPopup";
import StockTradePanel from "@/components/StockTradePanel";
import PortfolioWeightPie from "@/components/PortfolioWeightPie";
import EditableEp from "@/components/EntryPriceControl";
import SwitchArrow from "@/components/SwitchArrow";
import { useI18n } from "@/components/LanguageProvider";
import {
  fetchLiveQuotesClient,
  livePortfolioReturnPct,
  returnSinceEntryPct,
} from "@/lib/livePerformance";
import Skeleton, { DashboardSkeleton } from "@/components/Skeleton";
import { storageGet, storageSet } from "@/lib/safeStorage";

const ENTRY_COACH_KEY = "sniper.entryCoach.v1";
const GUEST_TRUST_KEY = "sniper.guestTrust.v1";

type HoldingView = {
  original: string;
  current: string;
  source: "user" | "ai";
  weightPct?: number;
  holding: PortfolioHolding;
};

type FvSearchHit = {
  ticker: string;
  name: string;
  industry: string;
  price: number;
  fairValue: number;
  upsidePct: number;
  hasFv?: boolean;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [portfolio, setPortfolio] = useState<BuiltPortfolio | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [blurbs, setBlurbs] = useState<
    Record<string, { headline: string; entry: string }>
  >({});
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [entryDates, setEntryDates] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Stock | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [fvHits, setFvHits] = useState<FvSearchHit[]>([]);
  const [fvSearching, setFvSearching] = useState(false);
  const [addingTicker, setAddingTicker] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [replaceNote, setReplaceNote] = useState<string | null>(null);
  const [replaceStack, setReplaceStack] = useState<ReplaceRecord[]>([]);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, number>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);

  const [storageWarn, setStorageWarn] = useState(false);
  const [entryCoachDismissed, setEntryCoachDismissed] = useState(true);
  const [guestTrustDismissed, setGuestTrustDismissed] = useState(true);

  function hydrateFromStorage() {
    setPortfolio(loadPortfolio());
    setSwaps(loadSwaps());
    setEntries(loadEntries());
    setEntryDates(loadEntryDates());
    setRemoved(loadRemoved());
    setAdded(loadAdded());
    setReplaceStack(loadReplaceStack());
    setEntryCoachDismissed(storageGet(ENTRY_COACH_KEY) === "true");
    setGuestTrustDismissed(storageGet(GUEST_TRUST_KEY) === "true");
  }

  useEffect(() => {
    hydrateFromStorage();
    Promise.all([
      fetch("/api/stocks").then((r) => r.json()),
      fetch("/api/blurbs").then((r) => r.json()),
    ])
      .then(([s, b]) => {
        const list = Array.isArray(s) ? s : [];
        setStocks(list);
        setBlurbs(b && typeof b === "object" && !Array.isArray(b) ? b : {});
        for (const row of list) {
          const img = new Image();
          img.src = `/logos/${encodeURIComponent(row.ticker)}.png?v=native`;
        }
      })
      .catch(() => {
        setStocks([]);
      })
      .finally(() => setLoading(false));

    // Re-read after backgrounding (iOS Safari / in-app browsers).
    const onVis = () => {
      if (document.visibilityState === "visible") hydrateFromStorage();
    };
    window.addEventListener("focus", hydrateFromStorage);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("sniper:portfolio", hydrateFromStorage);
    return () => {
      window.removeEventListener("focus", hydrateFromStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("sniper:portfolio", hydrateFromStorage);
    };
  }, []);

  const stockMap = useMemo(() => {
    const m = new Map<string, Stock>();
    for (const s of stocks) m.set(s.ticker, s);
    if (portfolio) {
      for (const h of portfolio.holdings) {
        if (!m.has(h.ticker)) {
          const fromSnap = stockFromHolding(h, m);
          if (fromSnap) m.set(h.ticker, fromSnap);
        }
      }
    }
    for (const h of added) {
      if (!m.has(h.ticker)) {
        const fromSnap = stockFromHolding(h, m);
        if (fromSnap) m.set(h.ticker, fromSnap);
      }
    }
    for (const [ticker, blurb] of Object.entries(blurbs)) {
      const existing = m.get(ticker);
      if (existing) {
        m.set(ticker, {
          ...existing,
          business: blurb.headline || existing.business,
          reasoning: blurb.entry || existing.reasoning,
        });
      }
    }
    return m;
  }, [stocks, portfolio, blurbs, added]);

  const holdings = useMemo<HoldingView[]>(() => {
    if (!portfolio) return [];
    const removedSet = new Set(removed.map((t) => t.toUpperCase()));
    const base = portfolio.holdings
      .filter((h) => !removedSet.has(h.ticker.toUpperCase()))
      .map((h) => ({
        original: h.ticker,
        current: swaps[h.ticker] ?? h.ticker,
        source: h.source,
        weightPct: h.weightPct,
        holding: h,
      }));
    const extras = added.map((h) => ({
      original: h.ticker,
      current: h.ticker,
      source: "user" as const,
      weightPct: h.weightPct,
      holding: h,
    }));
    return [...base, ...extras];
  }, [portfolio, swaps, removed, added]);

  const currentStocks = useMemo(() => {
    return holdings
      .map((h) => {
        const fromApi = stockMap.get(h.current);
        if (fromApi) return fromApi;
        return stockFromHolding(h.holding, stockMap);
      })
      .filter((s): s is Stock => Boolean(s));
  }, [holdings, stockMap]);

  const heldTickers = useMemo(
    () => holdings.map((h) => h.current.toUpperCase()).join(","),
    [holdings]
  );

  // Live FMP quotes for performance vs user entries.
  // Re-runs when holdings change or quoteNonce bumps (entry set / stock added).
  useEffect(() => {
    const symbols = heldTickers
      ? heldTickers.split(",").filter(Boolean)
      : [];
    if (symbols.length === 0) {
      setLiveQuotes({});
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    fetchLiveQuotesClient(symbols)
      .then((q) => {
        if (!cancelled) setLiveQuotes(q);
      })
      .catch(() => {
        if (!cancelled) setLiveQuotes({});
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });
    const id = window.setInterval(() => {
      fetchLiveQuotesClient(symbols)
        .then((q) => {
          if (!cancelled) setLiveQuotes(q);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [heldTickers]);

  /** Pull fresh FMP quotes immediately (entry set / add / switch). */
  async function refreshQuotesNow(extra: string[] = []) {
    const fromHoldings = heldTickers
      ? heldTickers.split(",").filter(Boolean)
      : [];
    const symbols = [
      ...new Set(
        [...fromHoldings, ...extra.map((s) => s.toUpperCase().trim())].filter(
          Boolean
        )
      ),
    ];
    if (symbols.length === 0) return;
    setQuotesLoading(true);
    try {
      const q = await fetchLiveQuotesClient(symbols);
      setLiveQuotes((prev) => ({ ...prev, ...q }));
    } catch {
      // keep prior quotes
    } finally {
      setQuotesLoading(false);
      // Bump so the performance chart reloads 1W/1M/ALL history now.
      setQuoteNonce((n) => n + 1);
    }
  }

  const liveReturnPct = useMemo(() => {
    return livePortfolioReturnPct(
      holdings.map((h) => {
        const ticker = h.current.toUpperCase();
        const entry = entries[ticker];
        const live = liveQuotes[ticker];
        return {
          ticker,
          entry: entry ?? 0,
          weightPct: h.weightPct,
          live: live ?? 0,
        };
      })
    );
  }, [holdings, entries, liveQuotes]);

  const chartPositions = useMemo(() => {
    const out: {
      ticker: string;
      entry: number;
      weightPct?: number;
      since?: string;
    }[] = [];
    for (const h of holdings) {
      const ticker = h.current.toUpperCase();
      const entry = entries[ticker];
      if (typeof entry !== "number" || entry <= 0) continue;
      out.push({
        ticker,
        entry,
        weightPct: h.weightPct,
        since: entryDates[ticker],
      });
    }
    return out;
  }, [holdings, entries, entryDates]);

  const hasAnyEntry = useMemo(
    () => chartPositions.length > 0,
    [chartPositions]
  );

  const showEntryCoach = !hasAnyEntry && !entryCoachDismissed;
  const showGuestTrust = !guestTrustDismissed;

  const firstUnsetTicker = useMemo(() => {
    for (const h of holdings) {
      const ticker = h.current.toUpperCase();
      const entry = entries[ticker];
      if (typeof entry !== "number" || entry <= 0) return ticker;
    }
    return null;
  }, [holdings, entries]);

  function dismissEntryCoach() {
    storageSet(ENTRY_COACH_KEY, "true");
    setEntryCoachDismissed(true);
  }

  function dismissGuestTrust() {
    storageSet(GUEST_TRUST_KEY, "true");
    setGuestTrustDismissed(true);
  }

  // Must stay above any early return — hooks can't run after conditional returns.
  const weightSlices = useMemo(
    () =>
      holdings
        .map((h) => {
          const s =
            stockMap.get(h.current) ?? stockFromHolding(h.holding, stockMap);
          if (!s) return null;
          return {
            ticker: s.ticker,
            sector: s.sector || "Other",
            industry: s.industry,
            weightPct:
              typeof h.weightPct === "number" && h.weightPct > 0
                ? h.weightPct
                : 0,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    [holdings, stockMap]
  );

  // Search full FvIndustries universe (~805 symbols), not just the site catalog.
  useEffect(() => {
    if (!addOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setFvSearching(true);
      setAddError(null);
      const params = new URLSearchParams({
        q: addQuery.trim(),
        exclude: heldTickers,
      });
      fetch(`/api/fv/search?${params}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Search failed");
          return data as { hits: FvSearchHit[] };
        })
        .then((data) => {
          if (!cancelled) setFvHits(data.hits || []);
        })
        .catch((err) => {
          if (!cancelled) {
            setFvHits([]);
            setAddError(
              err instanceof Error ? err.message : "Search failed"
            );
          }
        })
        .finally(() => {
          if (!cancelled) setFvSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addOpen, addQuery, heldTickers]);

  function poolFor(original: string): Stock[] {
    const base = stockMap.get(original);
    if (!base) return [];
    const tickers = new Set<string>([original, ...base.alternatives]);
    return [...tickers]
      .map((t) => stockMap.get(t))
      .filter((s): s is Stock => Boolean(s) && s!.sector === base.sector)
      .sort((a, b) => a.beta - b.beta);
  }

  function handleSwitch(original: string, next: string) {
    saveSwap(original, next);
    setSwaps((prev) => {
      const copy = { ...prev };
      if (next.toUpperCase() === original.toUpperCase()) delete copy[original];
      else copy[original] = next;
      return copy;
    });
    setReplaceNote(null);
    void refreshQuotesNow([next]);
  }

  function handleRevertSwitch(original: string) {
    clearSwap(original);
    setSwaps((prev) => {
      const copy = { ...prev };
      delete copy[original];
      return copy;
    });
    setReplaceNote(t("dash.revertedSwitch", { ticker: original }));
    void refreshQuotesNow([original]);
  }

  function handleSaveEntry(ticker: string, price: number) {
    const wrote = saveEntry(ticker, price);
    if (!wrote.ok) {
      setStorageWarn(true);
      return;
    }
    setStorageWarn(false);
    setEntries((prev) => ({ ...prev, [ticker.toUpperCase()]: price }));
    setEntryDates(loadEntryDates());
    void refreshQuotesNow([ticker]);
  }

  function handleRevertLastAdd() {
    const record = popReplace();
    if (!record) return;
    setReplaceStack(loadReplaceStack());

    const nextAdded = added.filter(
      (h) => h.ticker.toUpperCase() !== record.addedTicker.toUpperCase()
    );
    saveAdded(nextAdded);
    setAdded(nextAdded);

    if (record.droppedOriginal) {
      const nextRemoved = removed.filter(
        (t) => t.toUpperCase() !== record.droppedOriginal!.toUpperCase()
      );
      saveRemoved(nextRemoved);
      setRemoved(nextRemoved);
      setReplaceNote(
        t("dash.revertedAdd", {
          added: record.addedTicker,
          dropped: record.droppedCurrent || record.droppedOriginal,
        })
      );
    } else {
      setReplaceNote(
        t("dash.revertedPersonal", { ticker: record.addedTicker })
      );
    }
    void refreshQuotesNow();
  }

  function commitAdd(stock: Stock, industry?: string) {
    if (added.length >= MAX_PERSONAL_ADDS) return;
    if (holdings.some((h) => h.current === stock.ticker)) return;

    const removedSet = new Set(removed.map((t) => t.toUpperCase()));
    const builtSlots =
      portfolio?.holdings.filter(
        (h) => !removedSet.has(h.ticker.toUpperCase())
      ) ?? [];

    const candidates = builtSlots.map((h) => {
      const current = swaps[h.ticker] ?? h.ticker;
      const s =
        stockMap.get(current) ?? stockFromHolding(h, stockMap) ?? null;
      return {
        originalTicker: h.ticker,
        currentTicker: current,
        sector: s?.sector || h.snapshot?.sector || stock.sector,
        industry: h.snapshot?.industry || undefined,
        beta: s?.beta ?? h.snapshot?.beta ?? 1,
        weightPct: h.weightPct,
      };
    });

    const drop = pickStockToEliminate(
      { sector: stock.sector, industry, beta: stock.beta },
      candidates
    );

    if (drop) {
      const nextRemoved = [...removed, drop.originalTicker.toUpperCase()];
      saveRemoved(nextRemoved);
      setRemoved(nextRemoved);
    }

    const stack = pushReplace({
      addedTicker: stock.ticker,
      droppedOriginal: drop?.originalTicker,
      droppedCurrent: drop?.currentTicker,
    });
    setReplaceStack(stack);

    const holding: PortfolioHolding = {
      ticker: stock.ticker,
      source: "user",
      weightPct: drop?.weightPct,
      snapshot: {
        name: stock.name,
        sector: stock.sector,
        industry,
        price: stock.price,
        fairValue: stock.fairValue,
        upsidePct: stock.upsidePct,
        beta: stock.beta,
        sharpe: stock.sharpe,
        business: stock.business,
        reasoning: stock.reasoning,
      },
    };
    const next = [...added, holding];
    saveAdded(next);
    setAdded(next);
    setStocks((prev) => {
      if (prev.some((s) => s.ticker === stock.ticker)) return prev;
      return [...prev, stock];
    });

    if (drop) {
      setReplaceNote(
        t("dash.replaced", {
          added: stock.ticker,
          dropped: drop.currentTicker,
        })
      );
    } else {
      setReplaceNote(null);
    }

    setAddOpen(false);
    setAddQuery("");
    setFvHits([]);
    setAddError(null);
    void refreshQuotesNow([stock.ticker]);
  }

  async function handleAddHit(hit: FvSearchHit) {
    if (added.length >= MAX_PERSONAL_ADDS) return;
    if (holdings.some((h) => h.current === hit.ticker)) return;
    setAddingTicker(hit.ticker);
    setAddError(null);
    try {
      const res = await fetch(
        `/api/fv/lookup?symbol=${encodeURIComponent(hit.ticker)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fair value lookup failed");
      const stock: Stock = {
        ticker: data.ticker,
        name: data.name || hit.name || data.ticker,
        sector: (data.sector as GicsSector) || "Information Technology",
        industry:
          typeof data.industry === "string" && data.industry
            ? data.industry
            : hit.industry || undefined,
        price: Number(data.price) || hit.price,
        fairValue: Number(data.fairValue) || hit.fairValue,
        upsidePct: Number(data.upsidePct) || hit.upsidePct,
        beta: Number(data.beta) || 1,
        sharpe: Number(data.sharpe) || 0,
        business: data.business,
        reasoning: data.reasoning || data.entry || "",
        levels: data.levels || {
          ep: Number(data.price) || hit.price,
          tp: Number(data.fairValue) || hit.fairValue,
          sl: Number(
            ((Number(data.price) || hit.price) * 0.9).toFixed(2)
          ),
        },
        alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
      };
      commitAdd(stock, typeof data.industry === "string" ? data.industry : hit.industry);
      // Materialize logo for any personally added name.
      void fetch(`/api/logo/${encodeURIComponent(stock.ticker)}`).catch(
        () => undefined
      );
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Could not load fair value"
      );
    } finally {
      setAddingTicker(null);
    }
  }

  const canRevertAdd = replaceStack.length > 0;
  const popupHolding = popup
    ? holdings.find((h) => h.current === popup.ticker)
    : null;
  const popupSwitchPool = popupHolding ? poolFor(popupHolding.original) : [];
  const popupUserEp = popup ? entries[popup.ticker] ?? null : null;
  const popupLive = popup
    ? liveQuotes[popup.ticker.toUpperCase()] ?? null
    : null;
  const popupSince =
    popupUserEp != null && popupLive != null
      ? returnSinceEntryPct(popupUserEp, popupLive)
      : null;
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!portfolio || (portfolio.holdings.length === 0 && added.length === 0)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
          YOURS
        </p>
        <h1 className="mt-2 text-lg font-bold tracking-wide text-white sm:text-xl">
          {t("dash.empty")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-terminal-muted">
          {t("dash.emptyBody")}
        </p>
        <Link
          href="/build"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-terminal-accent px-8 py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg"
        >
          {t("dash.getStarted")}
        </Link>
      </div>
    );
  }

  const canAdd = added.length < MAX_PERSONAL_ADDS;
  const demoteExtras = !hasAnyEntry;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-wide sm:text-lg">
            {t("dash.title")}
          </h1>
          <p className="truncate text-[10px] text-terminal-muted">
            {t("dash.meta", {
              n: holdings.length,
              date: new Date(portfolio.createdAt).toLocaleDateString(),
            })}{" "}
            · {t("perf.tapRow")}
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 transition-opacity ${
            demoteExtras ? "opacity-35" : ""
          }`}
        >
          <span className="text-[10px] text-terminal-muted sm:text-[10px]">
            {t("dash.addLeft", { n: MAX_PERSONAL_ADDS - added.length })}
          </span>
          <button
            type="button"
            disabled={!canAdd || demoteExtras}
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex min-h-11 items-center rounded-md border border-terminal-orange/40 bg-terminal-orange/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-terminal-orange disabled:opacity-40"
            title={demoteExtras ? t("dash.entryCoachTitle") : undefined}
          >
            {t("dash.addMine")}
          </button>
          <button
            onClick={() => {
              clearPortfolio();
              window.location.href = "/build";
            }}
            className="inline-flex min-h-11 items-center rounded-md border border-terminal-border px-3 py-2 text-[10px] text-terminal-muted disabled:opacity-40"
            disabled={demoteExtras}
            title={demoteExtras ? t("dash.entryCoachTitle") : undefined}
          >
            {t("dash.startOver")}
          </button>
        </div>
      </div>

      {storageWarn ? (
        <div className="rounded-lg border border-terminal-bad/40 bg-terminal-bad/10 px-3 py-2 text-[11px] leading-snug text-terminal-bad">
          {t("dash.storageBlocked")}
        </div>
      ) : null}

      {showGuestTrust ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-terminal-border bg-terminal-panel/80 px-3 py-2 animate-fadeIn">
          <p className="text-[11px] leading-snug text-terminal-muted">
            {t("dash.guestTrust")}
          </p>
          <button
            type="button"
            onClick={dismissGuestTrust}
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-[10px] font-bold uppercase tracking-wider text-terminal-accent"
          >
            {t("dash.guestTrustDismiss")}
          </button>
        </div>
      ) : null}

      {showEntryCoach ? (
        <div className="animate-fadeIn rounded-xl border border-terminal-accent/50 bg-terminal-accent/10 px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terminal-accent">
            {t("dash.entryCoachTitle")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/90">
            {t("dash.entryCoachBody")}
          </p>
          <button
            type="button"
            onClick={dismissEntryCoach}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-terminal-accent px-4 py-2 text-[11px] font-bold tracking-[0.16em] text-black"
          >
            {t("dash.entryCoachCta")}
          </button>
        </div>
      ) : null}

      {replaceNote || canRevertAdd ? (
        <div className="flex flex-wrap items-center justify-between gap-1 rounded border border-terminal-border bg-terminal-panel px-2 py-1.5">
          <p className="line-clamp-2 text-[10px] text-white/80">
            {replaceNote
              ? replaceNote
              : replaceStack[replaceStack.length - 1]?.droppedCurrent
                ? t("dash.replaced", {
                    added:
                      replaceStack[replaceStack.length - 1]?.addedTicker ?? "",
                    dropped:
                      replaceStack[replaceStack.length - 1]?.droppedCurrent ??
                      "",
                  })
                : t("dash.addedOnly", {
                    added:
                      replaceStack[replaceStack.length - 1]?.addedTicker ?? "",
                  })}
          </p>
          {canRevertAdd ? (
            <button
              type="button"
              onClick={handleRevertLastAdd}
              className="text-[9px] font-bold uppercase tracking-wider text-white/70"
            >
              {t("dash.revert")}
            </button>
          ) : null}
        </div>
      ) : null}

      {addOpen && canAdd && !demoteExtras ? (
        <div className="rounded-lg border border-terminal-border bg-terminal-panel p-2">
          <p className="mb-1.5 text-[10px] leading-snug text-terminal-muted">
            {t("dash.addHint")}
          </p>
          <input
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder={t("dash.addSearch")}
            className="mb-1 min-h-12 w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2.5 text-base outline-none focus:border-terminal-orange"
          />
          <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
            {fvHits.map((hit) => (
              <button
                key={hit.ticker}
                type="button"
                disabled={addingTicker === hit.ticker}
                onClick={() => handleAddHit(hit)}
                className="flex min-h-11 items-center justify-between rounded-md px-2 py-2 text-left text-sm disabled:opacity-50"
              >
                <span className="min-w-0 truncate">
                  <span className="font-bold">{hit.ticker}</span>
                  <span className="ms-1 text-terminal-muted">
                    {hit.name !== hit.ticker ? hit.name : hit.industry}
                  </span>
                  {hit.hasFv === false ? (
                    <span className="ms-1.5 text-[9px] uppercase tracking-wider text-terminal-accent/80">
                      {t("dash.addProvisional")}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[9px] text-terminal-orange">
                  {t("dash.add")}
                </span>
              </button>
            ))}
            {!fvSearching && fvHits.length === 0 ? (
              <p className="text-[10px] text-terminal-muted">
                {addError || t("dash.addNone")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Top: performance — secondary until first entry */}
      <div
        className={`relative min-h-[220px] sm:min-h-[260px] transition-opacity ${
          !hasAnyEntry ? "opacity-55" : ""
        }`}
      >
        {quotesLoading && !hasAnyEntry ? (
          <div className="absolute inset-0 z-10 flex items-center bg-black/40 px-1">
            <Skeleton variant="block" className="w-full" />
          </div>
        ) : null}
        <PerformanceChart
          compact
          liveReturnPct={liveReturnPct}
          positions={chartPositions}
          loading={quotesLoading}
          refreshKey={quoteNonce}
          subtitle={
            hasAnyEntry ? t("perf.sinceEntry") : t("perf.sinceEntryEmpty")
          }
        />
      </div>

      <div
        className={`mt-3 animate-fadeIn transition-opacity ${
          !hasAnyEntry ? "opacity-60" : ""
        }`}
      >
        <PortfolioRiskPanel
          holdings={holdings.map((h) => {
            const s =
              stockMap.get(h.current) ??
              stockFromHolding(h.holding, stockMap);
            return {
              ticker: h.current,
              name: s?.name ?? h.holding.snapshot?.name,
              sector: s?.sector ?? h.holding.snapshot?.sector,
              weightPct: h.weightPct,
            };
          })}
          example={!holdings.length}
        />
      </div>

      {/* Stock panels — primary surface for first entry */}
      <div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {holdings.map((h) => {
            const s =
              stockMap.get(h.current) ?? stockFromHolding(h.holding, stockMap);
            if (!s) return null;
            const switchPool = poolFor(h.original);
            const userEp = entries[s.ticker] ?? null;
            const livePx = liveQuotes[s.ticker.toUpperCase()];
            const sinceEntry =
              userEp != null && livePx != null
                ? returnSinceEntryPct(userEp, livePx)
                : null;
            const levels =
              levelsWithUserEntry(s.levels, userEp) ?? s.levels;
            const isSwitched =
              h.source === "ai" &&
              h.current.toUpperCase() !== h.original.toUpperCase();
            const isCoachFocus =
              showEntryCoach &&
              firstUnsetTicker != null &&
              s.ticker.toUpperCase() === firstUnsetTicker;

            return (
              <div
                key={`panel-${h.original}-${h.current}`}
                className={
                  isCoachFocus
                    ? "rounded-xl ring-2 ring-terminal-accent/70 ring-offset-2 ring-offset-black animate-fadeIn"
                    : undefined
                }
              >
                {isCoachFocus ? (
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-terminal-accent">
                    {t("dash.entryCoachFocus")}
                  </p>
                ) : null}
                <StockTradePanel
                  stock={{ ...s, levels, price: livePx ?? s.price }}
                  sinceEntry={sinceEntry}
                  weightPct={h.weightPct}
                  badge={
                    h.source === "ai" ? t("dash.ourPick") : t("dash.yourPick")
                  }
                  livePrice={livePx}
                  onClick={() =>
                    setPopup({
                      ...s,
                      levels,
                      price: livePx ?? s.price,
                    })
                  }
                  buyControl={
                    <EditableEp
                      plannedEp={s.levels.ep}
                      value={userEp}
                      priceOnly
                      onSave={(price) => handleSaveEntry(s.ticker, price)}
                    />
                  }
                  trailing={
                    <>
                      {h.source === "ai" && switchPool.length > 1 ? (
                        <SwitchArrow
                          pool={switchPool}
                          currentTicker={h.current}
                          onSwitch={(next) => handleSwitch(h.original, next)}
                        />
                      ) : null}
                      {isSwitched ? (
                        <button
                          type="button"
                          onClick={() => handleRevertSwitch(h.original)}
                          className="px-0.5 text-[8px] uppercase text-white/50"
                          title={t("dash.revertSwitch")}
                        >
                          ↺
                        </button>
                      ) : null}
                    </>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Under panels: weight pie by sector → industries */}
      <div className={!hasAnyEntry ? "opacity-50" : undefined}>
        <PortfolioWeightPie holdings={weightSlices} />
      </div>

      {popup && (
        <ReasoningPopup
          stock={popup}
          onClose={() => setPopup(null)}
          livePrice={popupLive}
          sinceEntry={popupSince}
          extras={
            <div className="space-y-2">
              <EditableEp
                plannedEp={popup.levels.ep}
                value={popupUserEp}
                onSave={(price) => handleSaveEntry(popup.ticker, price)}
              />
              {popupHolding?.source === "ai" && popupSwitchPool.length > 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-terminal-muted">
                    {t("switch.title")}
                  </span>
                  <SwitchArrow
                    pool={popupSwitchPool}
                    currentTicker={popupHolding.current}
                    onSwitch={(next) => {
                      handleSwitch(popupHolding.original, next);
                      const nextStock = stockMap.get(next);
                      if (nextStock) setPopup(nextStock);
                    }}
                  />
                </div>
              ) : null}
            </div>
          }
        />
      )}
    </div>
  );
}
