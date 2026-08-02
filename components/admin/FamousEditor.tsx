"use client";

import { useEffect, useState } from "react";
import { Field, TextInput, SaveButton } from "./fields";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function FamousEditor() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/famous")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load famous picks");
        return d;
      })
      .then((d) => setSymbols(Array.isArray(d.symbols) ? d.symbols : []))
      .catch((e: Error) => setError(e.message));
  }, []);

  function add() {
    const t = draft.toUpperCase().trim();
    if (!t) return;
    setSymbols((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setDraft("");
  }

  function remove(sym: string) {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }

  function move(sym: string, dir: -1 | 1) {
    setSymbols((prev) => {
      const i = prev.indexOf(sym);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setState("saving");
    setError(null);
    try {
      const r = await fetch("/api/admin/famous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Save failed");
      setSymbols(data.symbols);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setState("error");
    }
  }

  return (
    <div>
      <p className="mb-4 text-xs text-terminal-muted">
        Tickers shown on the public Build screen for user picks (1–4). Auto-fill
        still draws from the full catalog / valuation universe. Saving also
        creates missing tickers in LEVELS so you can set EP / TP / SL.
      </p>

      {error && (
        <div className="mb-3 rounded border border-terminal-bad/40 bg-terminal-bad/10 px-3 py-2 text-sm text-terminal-bad">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="Add ticker">
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. AAPL"
          />
        </Field>
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-terminal-border px-3 py-1.5 text-xs text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
        >
          ADD
        </button>
        <SaveButton onClick={save} state={state} />
      </div>

      <div className="flex flex-col gap-2">
        {symbols.map((sym) => (
          <div
            key={sym}
            className="flex items-center justify-between rounded-lg border border-terminal-border bg-terminal-panel px-3 py-2"
          >
            <span className="font-bold tracking-wide">{sym}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(sym, -1)}
                className="rounded px-2 py-1 text-xs text-terminal-muted hover:text-terminal-text"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(sym, 1)}
                className="rounded px-2 py-1 text-xs text-terminal-muted hover:text-terminal-text"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(sym)}
                className="rounded px-2 py-1 text-xs text-terminal-bad hover:bg-terminal-bad/10"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {symbols.length === 0 && (
          <p className="text-sm text-terminal-muted">No famous picks yet.</p>
        )}
      </div>
    </div>
  );
}
