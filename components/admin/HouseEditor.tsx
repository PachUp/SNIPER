"use client";

import { useEffect, useState } from "react";
import {
  GICS_SECTORS,
  type HousePortfolio,
  type SniperHolding,
} from "@/lib/types";
import {
  Field,
  NumberInput,
  TextInput,
  TextArea,
  Select,
  SaveButton,
} from "./fields";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function HouseEditor() {
  const [house, setHouse] = useState<HousePortfolio | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [newTicker, setNewTicker] = useState("");
  const [addState, setAddState] = useState<SaveState>("idle");
  const [addError, setAddError] = useState<string | null>(null);

  function loadAll() {
    return fetch("/api/snipers")
      .then((r) => r.json())
      .then((portfolio: HousePortfolio) => setHouse(portfolio))
      .catch(() => setHouse(null));
  }

  useEffect(() => {
    void loadAll();
  }, []);

  if (!house) {
    return <div className="text-terminal-muted">Loading…</div>;
  }

  function updateHolding(idx: number, patch: Partial<SniperHolding>) {
    setHouse((prev) =>
      prev
        ? {
            ...prev,
            holdings: prev.holdings.map((h, i) =>
              i === idx ? { ...h, ...patch } : h
            ),
          }
        : prev
    );
  }

  async function addHolding() {
    const t = newTicker.toUpperCase().trim();
    if (!t || !house) return;
    if (house.holdings.some((h) => h.ticker === t)) {
      setAddError(`${t} is already in the book — edit it below.`);
      return;
    }
    setAddError(null);
    setAddState("saving");
    try {
      const r = await fetch("/api/admin/snipers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, fromLevels: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Not found in LEVELS");
      const holding = data.holding as SniperHolding;
      setHouse((prev) =>
        prev ? { ...prev, holdings: [holding, ...prev.holdings] } : prev
      );
      setNewTicker("");
      setAddState("saved");
      setTimeout(() => setAddState("idle"), 1500);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Add failed");
      setAddState("error");
    }
  }

  /** Reload name/thesis from LEVELS only — keeps your actual entry EP/TP/SL. */
  async function reloadMetaFromLevels(idx: number, ticker: string) {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    setAddError(null);
    setAddState("saving");
    try {
      const r = await fetch("/api/admin/snipers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, fromLevels: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Not found in LEVELS");
      const filled = data.holding as SniperHolding;
      setHouse((prev) => {
        if (!prev) return prev;
        const current = prev.holdings[idx];
        return {
          ...prev,
          holdings: prev.holdings.map((h, i) =>
            i === idx
              ? {
                  ...filled,
                  weightPct: current?.weightPct ?? filled.weightPct,
                  // keep actual entry levels for trades in play
                  levels: current?.levels ?? filled.levels,
                }
              : h
          ),
        };
      });
      setAddState("saved");
      setTimeout(() => setAddState("idle"), 1500);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Lookup failed");
      setAddState("error");
    }
  }

  async function saveAll() {
    if (!house) return;
    setState("saving");
    try {
      const r = await fetch("/api/admin/snipers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: { ...house, updated: new Date().toISOString() },
        }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (data.portfolio) setHouse(data.portfolio);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="max-w-md">
          <Field label="Portfolio name">
            <TextInput
              value={house.name}
              onChange={(e) =>
                setHouse((p) => (p ? { ...p, name: e.target.value } : p))
              }
            />
          </Field>
        </div>
        <p className="text-xs text-terminal-muted">
          Trades already in play. Add a ticker from{" "}
          <strong>LEVELS &amp; STOCKS</strong>, then edit EP/TP/SL to your
          actual entry. Those levels stay on this book only — they do not
          change LEVELS &amp; STOCKS.
        </p>
        {addError && (
          <div className="rounded border border-terminal-bad/40 bg-terminal-bad/10 px-3 py-2 text-sm text-terminal-bad">
            {addError}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Add from LEVELS">
            <TextInput
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addHolding();
                }
              }}
              placeholder="e.g. IBM"
            />
          </Field>
          <button
            type="button"
            onClick={() => void addHolding()}
            disabled={addState === "saving" || !newTicker.trim()}
            className="rounded-md bg-terminal-accent px-3 py-1.5 text-xs font-bold text-terminal-bg disabled:opacity-50"
          >
            {addState === "saving" ? "Looking up…" : "Add holding"}
          </button>
          <div className="ms-auto">
            <SaveButton onClick={saveAll} state={state} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {house.holdings.map((h, idx) => (
          <div
            key={`${h.ticker}-${idx}`}
            className="rounded-lg border border-terminal-border bg-terminal-panel p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Ticker">
                <TextInput
                  value={h.ticker}
                  onChange={(e) =>
                    updateHolding(idx, {
                      ticker: e.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>
              <Field label="Name">
                <TextInput
                  value={h.name}
                  onChange={(e) => updateHolding(idx, { name: e.target.value })}
                />
              </Field>
              <Field label="Sector">
                <Select
                  value={h.sector}
                  onChange={(e) =>
                    updateHolding(idx, {
                      sector: e.target.value as SniperHolding["sector"],
                    })
                  }
                >
                  {GICS_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Industry">
                <TextInput
                  value={h.industry ?? ""}
                  onChange={(e) =>
                    updateHolding(idx, { industry: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Weight %">
                <NumberInput
                  value={h.weightPct}
                  onChange={(e) =>
                    updateHolding(idx, {
                      weightPct: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Your entry (EP)">
                <NumberInput
                  value={h.levels.ep}
                  onChange={(e) =>
                    updateHolding(idx, {
                      levels: {
                        ...h.levels,
                        ep: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Your target (TP)">
                <NumberInput
                  value={h.levels.tp}
                  onChange={(e) =>
                    updateHolding(idx, {
                      levels: {
                        ...h.levels,
                        tp: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Your stop (SL)">
                <NumberInput
                  value={h.levels.sl}
                  onChange={(e) =>
                    updateHolding(idx, {
                      levels: {
                        ...h.levels,
                        sl: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Business">
                <TextArea
                  value={h.business ?? ""}
                  onChange={(e) =>
                    updateHolding(idx, { business: e.target.value })
                  }
                  rows={2}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Entry thesis">
                <TextArea
                  value={h.reasoning}
                  onChange={(e) =>
                    updateHolding(idx, { reasoning: e.target.value })
                  }
                  rows={3}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Fundamental numbers">
                <TextArea
                  value={h.numbers ?? ""}
                  onChange={(e) =>
                    updateHolding(idx, { numbers: e.target.value })
                  }
                  rows={2}
                />
              </Field>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void reloadMetaFromLevels(idx, h.ticker)}
                disabled={addState === "saving" || !h.ticker.trim()}
                className="text-xs text-terminal-accent hover:underline disabled:opacity-40"
              >
                Reload thesis from LEVELS (keep my EP/TP/SL)
              </button>
              <button
                type="button"
                onClick={() =>
                  setHouse((p) =>
                    p
                      ? {
                          ...p,
                          holdings: p.holdings.filter((_, i) => i !== idx),
                        }
                      : p
                  )
                }
                className="text-xs text-terminal-bad hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
