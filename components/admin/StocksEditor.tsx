"use client";

import { useEffect, useMemo, useState } from "react";
import type { Stock } from "@/lib/types";
import { GICS_SECTORS } from "@/lib/types";
import {
  Field,
  NumberInput,
  TextInput,
  TextArea,
  Select,
  SaveButton,
} from "./fields";

type SaveState = "idle" | "saving" | "saved" | "error";
type Blurb = { headline: string; entry: string };

type Row = Stock & { business?: string; entry?: string };

export default function StocksEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [famous, setFamous] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "famous" | "autofill">("all");
  const [newTicker, setNewTicker] = useState("");
  const [syncState, setSyncState] = useState<SaveState>("idle");
  const [addError, setAddError] = useState<string | null>(null);

  function loadAll() {
    return Promise.all([
      fetch("/api/stocks").then((r) => r.json()),
      fetch("/api/admin/famous").then(async (r) => {
        const d = await r.json();
        if (!r.ok) return { symbols: [] as string[] };
        return d as { symbols?: string[] };
      }),
      fetch("/api/admin/blurbs").then(async (r) => {
        const d = await r.json();
        if (!r.ok) return { blurbs: {} as Record<string, Blurb> };
        return d as { blurbs?: Record<string, Blurb> };
      }),
    ])
      .then(
        ([stocks, fam, blurbRes]: [
          Stock[],
          { symbols?: string[] },
          { blurbs?: Record<string, Blurb> },
        ]) => {
          const list = Array.isArray(stocks) ? stocks : [];
          const blurbs = blurbRes.blurbs ?? {};
          const famousSet = new Set(
            (fam.symbols ?? []).map((s) => s.toUpperCase())
          );
          setFamous(famousSet);
          setRows(
            list.map((s) => ({
              ...s,
              name: s.name ?? s.ticker,
              sector: s.sector ?? "Information Technology",
              alternatives: Array.isArray(s.alternatives) ? s.alternatives : [],
              levels: s.levels ?? { ep: 0, tp: 0, sl: 0 },
              business: blurbs[s.ticker]?.headline ?? s.business ?? "",
              entry: blurbs[s.ticker]?.entry ?? "",
            }))
          );
        }
      )
      .catch(() => {
        setRows([]);
      });
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function syncAutofill() {
    setSyncState("saving");
    try {
      const r = await fetch("/api/admin/sync-autofill", { method: "POST" });
      if (!r.ok) throw new Error();
      await loadAll();
      setFilter("autofill");
      setSyncState("saved");
      setTimeout(() => setSyncState("idle"), 2000);
    } catch {
      setSyncState("error");
    }
  }

  function update(ticker: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((s) => (s.ticker === ticker ? { ...s, ...patch } : s))
    );
  }

  async function save(s: Row) {
    setStates((p) => ({ ...p, [s.ticker]: "saving" }));
    try {
      const r = await fetch("/api/admin/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          industry: s.industry,
          price: s.price,
          fairValue: s.fairValue,
          upsidePct: s.upsidePct,
          beta: s.beta,
          sharpe: s.sharpe,
          reasoning: s.reasoning,
          business: s.business,
          entry: s.entry,
          levels: s.levels,
          alternatives: s.alternatives,
          fromFv: false,
          skipFv: true,
        }),
      });
      if (!r.ok) throw new Error();
      setStates((p) => ({ ...p, [s.ticker]: "saved" }));
      setTimeout(
        () => setStates((p) => ({ ...p, [s.ticker]: "idle" })),
        1500
      );
    } catch {
      setStates((p) => ({ ...p, [s.ticker]: "error" }));
    }
  }

  async function addStock() {
    const t = newTicker.toUpperCase().trim();
    if (!t) return;
    if (rows.some((r) => r.ticker === t)) {
      setAddError(`${t} is already in the catalog — edit it below.`);
      return;
    }
    setAddError(null);
    setStates((p) => ({ ...p, [t]: "saving" }));
    try {
      const r = await fetch("/api/admin/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, fromFv: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "FvIndustries lookup failed");
      const stock = data.stock as Stock;
      setRows((prev) => [
        {
          ...stock,
          business: (data.stock as Row).business ?? "",
          entry: "",
        },
        ...prev,
      ]);
      // reload so blurbs/entry populate
      await loadAll();
      setFilter("all");
      setQuery(t);
      setNewTicker("");
      setStates((p) => ({ ...p, [t]: "saved" }));
      setTimeout(() => setStates((p) => ({ ...p, [t]: "idle" })), 1500);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Add failed");
      setStates((p) => ({ ...p, [t]: "error" }));
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (filter === "famous" && !famous.has(s.ticker)) return false;
      if (filter === "autofill" && famous.has(s.ticker)) return false;
      const q = query.toLowerCase();
      if (!q) return true;
      return (
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q) ||
        (s.industry || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter, famous]);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <p className="text-xs text-terminal-muted">
          Source for <strong>user auto-picks</strong> and portfolio build — not
          the snipers book. Edit Buy (EP) / Sell (TP) / Exit (SL) and
          elaborations. <strong>Add stock</strong> looks up FvIndustries for new
          tickers. Changing LEVELS does not change the snipers book (executed
          entries stay as you set them).
        </p>
        {addError && (
          <div className="rounded border border-terminal-bad/40 bg-terminal-bad/10 px-3 py-2 text-sm text-terminal-bad">
            {addError}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Add stock">
            <TextInput
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addStock();
                }
              }}
              placeholder="e.g. MSFT"
            />
          </Field>
          <button
            type="button"
            onClick={() => void addStock()}
            className="rounded-md bg-terminal-accent px-3 py-1.5 text-xs font-bold text-terminal-bg"
          >
            Add stock
          </button>
          <button
            type="button"
            onClick={() => void syncAutofill()}
            disabled={syncState === "saving"}
            className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wider ${
              syncState === "saved"
                ? "bg-terminal-good/20 text-terminal-good"
                : syncState === "error"
                ? "bg-terminal-bad/20 text-terminal-bad"
                : "border border-terminal-accent text-terminal-accent"
            }`}
          >
            {syncState === "saving"
              ? "SYNCING…"
              : syncState === "saved"
              ? "SYNCED ✓"
              : syncState === "error"
              ? "SYNC FAILED"
              : "SYNC AUTO-FILL"}
          </button>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {(
              [
                ["all", "All"],
                ["famous", "Famous picks"],
                ["autofill", "Auto-fill pool"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded px-2 py-1 text-[11px] tracking-wider ${
                  filter === id
                    ? "bg-terminal-accent/15 text-terminal-accent"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {label}
              </button>
            ))}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="rounded-md border border-terminal-border bg-terminal-bg px-3 py-1.5 text-sm outline-none focus:border-terminal-accent"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((s) => (
          <div
            key={s.ticker}
            className="rounded-lg border border-terminal-border bg-terminal-panel p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold">{s.ticker}</span>
                {famous.has(s.ticker) && (
                  <span className="ms-2 rounded bg-terminal-accent/15 px-2 py-0.5 text-[10px] text-terminal-accent">
                    FAMOUS
                  </span>
                )}
                <span className="ms-2 text-xs text-terminal-muted">
                  {s.name}
                </span>
                <div className="mt-0.5 text-[11px] text-terminal-muted">
                  {s.sector}
                  {s.industry ? ` · ${s.industry}` : ""}
                </div>
              </div>
              <SaveButton
                onClick={() => save(s)}
                state={states[s.ticker] ?? "idle"}
              />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Name">
                <TextInput
                  value={s.name}
                  onChange={(e) => update(s.ticker, { name: e.target.value })}
                />
              </Field>
              <Field label="Sector">
                <Select
                  value={s.sector}
                  onChange={(e) =>
                    update(s.ticker, {
                      sector: e.target.value as Stock["sector"],
                    })
                  }
                >
                  {GICS_SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Industry">
                <TextInput
                  value={s.industry ?? ""}
                  onChange={(e) =>
                    update(s.ticker, { industry: e.target.value })
                  }
                  placeholder="e.g. Software - Infrastructure"
                />
              </Field>
              <Field label="Upside %">
                <NumberInput
                  value={s.upsidePct}
                  onChange={(e) =>
                    update(s.ticker, { upsidePct: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Entry / Buy (EP)">
                <NumberInput
                  value={s.levels.ep}
                  onChange={(e) =>
                    update(s.ticker, {
                      levels: { ...s.levels, ep: Number(e.target.value) },
                    })
                  }
                />
              </Field>
              <Field label="Take Profit / Sell (TP)">
                <NumberInput
                  value={s.levels.tp}
                  onChange={(e) =>
                    update(s.ticker, {
                      levels: { ...s.levels, tp: Number(e.target.value) },
                    })
                  }
                />
              </Field>
              <Field label="Stop / Exit (SL)">
                <NumberInput
                  value={s.levels.sl}
                  onChange={(e) =>
                    update(s.ticker, {
                      levels: { ...s.levels, sl: Number(e.target.value) },
                    })
                  }
                />
              </Field>
              <Field label="Alternatives (comma)">
                <TextInput
                  value={s.alternatives.join(", ")}
                  onChange={(e) =>
                    update(s.ticker, {
                      alternatives: e.target.value
                        .split(",")
                        .map((t) => t.trim().toUpperCase())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Core business (under symbol)">
                <TextArea
                  value={s.business ?? ""}
                  onChange={(e) =>
                    update(s.ticker, { business: e.target.value })
                  }
                  rows={2}
                />
              </Field>
              <Field label="Entry reasoning (under symbol)">
                <TextArea
                  value={s.entry ?? ""}
                  onChange={(e) => update(s.ticker, { entry: e.target.value })}
                  rows={2}
                />
              </Field>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-terminal-muted">
            No stocks match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
