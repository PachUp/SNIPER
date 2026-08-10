"use client";

import { useEffect, useState } from "react";
import { GICS_SECTORS, type Idea, type Levels } from "@/lib/types";
import { upsidePctFromLevels } from "@/lib/format";
import {
  Field,
  NumberInput,
  TextInput,
  TextArea,
  Select,
  SaveButton,
} from "./fields";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function IdeasEditor() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [state, setState] = useState<SaveState>("idle");
  const [newTicker, setNewTicker] = useState("");
  const [addState, setAddState] = useState<SaveState>("idle");
  const [addError, setAddError] = useState<string | null>(null);

  function loadAll() {
    return fetch("/api/ideas")
      .then((r) => r.json())
      .then((d: Idea[]) => setIdeas(Array.isArray(d) ? d : []))
      .catch(() => setIdeas([]));
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function update(id: string, patch: Partial<Idea>) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  /** Edit EP/TP/SL and keep Upside % in sync with EP→TP. */
  function updateLevels(id: string, part: Partial<Levels>) {
    setIdeas((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const levels = { ...i.levels, ...part };
        const upsidePct = upsidePctFromLevels(levels);
        return {
          ...i,
          levels,
          ...(upsidePct != null ? { upsidePct } : {}),
        };
      })
    );
  }

  async function addIdea() {
    const t = newTicker.toUpperCase().trim();
    if (!t) return;
    if (ideas.some((i) => i.ticker === t)) {
      setAddError(`${t} is already in Ideas — edit it below.`);
      return;
    }
    setAddError(null);
    setAddState("saving");
    try {
      const r = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, fromLevels: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Not found in LEVELS");
      const idea = data.idea as Idea;
      setIdeas((prev) => [idea, ...prev]);
      setNewTicker("");
      setAddState("saved");
      setTimeout(() => setAddState("idle"), 1500);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Add failed");
      setAddState("error");
    }
  }

  async function refillFromLevels(id: string, ticker: string) {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    setAddError(null);
    setAddState("saving");
    try {
      const r = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, fromLevels: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Not found in LEVELS");
      const filled = data.idea as Idea;
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...filled,
                id: i.id, // keep stable id
              }
            : i
        )
      );
      setAddState("saved");
      setTimeout(() => setAddState("idle"), 1500);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Lookup failed");
      setAddState("error");
    }
  }

  async function saveAll() {
    setState("saving");
    try {
      const r = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideas }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (Array.isArray(data.ideas)) setIdeas(data.ideas);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <p className="text-xs text-terminal-muted">
          Add a ticker from <strong>LEVELS &amp; STOCKS</strong> — pulls name,
          sector, industry, entry thesis, fundamentals, and EP/TP/SL. Edit
          freely before saving. Ideas are their own list (does not change
          LEVELS or the snipers book).
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
                  void addIdea();
                }
              }}
              placeholder="e.g. MSFT"
            />
          </Field>
          <button
            type="button"
            onClick={() => void addIdea()}
            disabled={addState === "saving" || !newTicker.trim()}
            className="rounded-md bg-terminal-accent px-3 py-1.5 text-xs font-bold text-terminal-bg disabled:opacity-50"
          >
            {addState === "saving" ? "Looking up…" : "Add idea"}
          </button>
          <div className="ms-auto">
            <SaveButton onClick={saveAll} state={state} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="rounded-lg border border-terminal-border bg-terminal-panel p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Ticker">
                <TextInput
                  value={idea.ticker}
                  onChange={(e) =>
                    update(idea.id, { ticker: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="Name">
                <TextInput
                  value={idea.name}
                  onChange={(e) => update(idea.id, { name: e.target.value })}
                />
              </Field>
              <Field label="Sector">
                <Select
                  value={idea.sector}
                  onChange={(e) =>
                    update(idea.id, {
                      sector: e.target.value as Idea["sector"],
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
                  value={idea.industry ?? ""}
                  onChange={(e) =>
                    update(idea.id, { industry: e.target.value })
                  }
                  placeholder="from LEVELS"
                />
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Upside % (auto EP→TP)">
                <NumberInput
                  value={idea.upsidePct}
                  readOnly
                  tabIndex={-1}
                  title="Recalculated when you change EP or TP"
                />
              </Field>
              <Field label="EP">
                <NumberInput
                  value={idea.levels.ep}
                  onChange={(e) =>
                    updateLevels(idea.id, { ep: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="TP">
                <NumberInput
                  value={idea.levels.tp}
                  onChange={(e) =>
                    updateLevels(idea.id, { tp: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="SL">
                <NumberInput
                  value={idea.levels.sl}
                  onChange={(e) =>
                    updateLevels(idea.id, { sl: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Business">
                <TextArea
                  value={idea.business ?? ""}
                  onChange={(e) =>
                    update(idea.id, { business: e.target.value })
                  }
                  rows={2}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Entry thesis">
                <TextArea
                  value={idea.entry || idea.thesis}
                  onChange={(e) =>
                    update(idea.id, {
                      entry: e.target.value,
                      thesis: e.target.value,
                    })
                  }
                  rows={3}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Fundamental numbers">
                <TextArea
                  value={idea.numbers ?? ""}
                  onChange={(e) =>
                    update(idea.id, { numbers: e.target.value })
                  }
                  rows={2}
                  placeholder="Optional — shown when user expands details"
                />
              </Field>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void refillFromLevels(idea.id, idea.ticker)}
                disabled={addState === "saving" || !idea.ticker.trim()}
                className="text-xs text-terminal-accent hover:underline disabled:opacity-40"
              >
                Re-fill from LEVELS
              </button>
              <button
                type="button"
                onClick={() =>
                  setIdeas((p) => p.filter((i) => i.id !== idea.id))
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
