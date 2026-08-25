"use client";

import { useEffect, useState } from "react";

export type BuildStyle = "broad" | "growth";

const OPTIONS: {
  id: BuildStyle;
  title: string;
  tag: string;
  blurb: string;
  points: string[];
}[] = [
  {
    id: "broad",
    title: "Broad & Balanced",
    tag: "Steadier mix",
    blurb:
      "Fills from industries StockAnalysis tags as defensive / diversified — utilities, banks, REITs, energy, staples. Shared industries (credit, big pharma, restaurants) stay eligible.",
    points: [
      "Industry-based fill from the valuation universe",
      "Favors sector spread over max upside",
      "Your famous picks stay either way",
    ],
  },
  {
    id: "growth",
    title: "Growth-Tilted",
    tag: "Higher upside bias",
    blurb:
      "Fills from growth industries — software, semis, biotech, internet, renewables — plus the same shared exceptions. Same EP / TP / SL discipline.",
    points: [
      "Industry-based fill from the valuation universe",
      "Favors higher model upside",
      "Same EP / TP / SL guardrails",
    ],
  },
];

/** Choose portfolio style before build — drives industry-based fill. */
export default function BuildOptionPicker({
  selected,
  onSelect,
  onBack,
  onConfirm,
  busy,
}: {
  selected: BuildStyle | null;
  onSelect: (id: BuildStyle) => void;
  onBack: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [flash, setFlash] = useState<BuildStyle | null>(null);

  useEffect(() => {
    if (!selected) return;
    setFlash(selected);
    const id = window.setTimeout(() => setFlash(null), 420);
    return () => window.clearTimeout(id);
  }, [selected]);

  return (
    <div className="mx-auto max-w-3xl animate-fadeIn">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
        Step 2 of 2 · style
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-wide text-white sm:text-2xl">
        Choose how we complete your portfolio
      </h2>
      <p className="mt-2 text-sm text-terminal-muted">
        Your picks stay in both. Fill names come from Finviz industries in the
        StockAnalysis universe — Broad vs Growth, with shared industries in either.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const on = selected === opt.id;
          const flashing = flash === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`rounded-2xl border p-4 text-left transition-transform duration-300 ease-smooth ${
                on
                  ? "scale-[1.02] border-terminal-accent bg-terminal-accent/10"
                  : "border-terminal-border bg-terminal-panel hover:border-terminal-accent/40 active:scale-[0.99]"
              } ${flashing ? "opacity-100 ring-2 ring-terminal-accent/50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold tracking-wide text-white">
                  {opt.title}
                </span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-terminal-accent">
                  {opt.tag}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-terminal-muted">
                {opt.blurb}
              </p>
              <ul className="mt-3 space-y-1">
                {opt.points.map((p) => (
                  <li
                    key={p}
                    className="text-[11px] text-white/75 before:me-1.5 before:text-terminal-accent before:content-['·']"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="text-xs tracking-[0.2em] text-terminal-muted transition-opacity hover:text-terminal-accent disabled:opacity-40"
        >
          ← BACK TO PICKS
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selected || busy}
          className="rounded-full bg-terminal-accent px-10 py-3.5 text-sm font-bold tracking-[0.18em] text-black transition-transform duration-300 ease-smooth hover:scale-[1.03] active:scale-[0.97] disabled:scale-100 disabled:opacity-40"
        >
          {busy ? "BUILDING…" : "BUILD THIS STYLE"}
        </button>
      </div>
    </div>
  );
}
