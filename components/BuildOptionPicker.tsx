"use client";

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
      "Spreads the book across more sectors. Your famous picks stay; the fill leans diversified.",
    points: [
      "More sectors represented",
      "Lower single-theme concentration",
      "Clear buy / sell / exit on every name",
    ],
  },
  {
    id: "growth",
    title: "Growth-Tilted",
    tag: "Higher upside bias",
    blurb:
      "Keeps your famous picks and fills with more growth-oriented names. Same exit discipline.",
    points: [
      "Heavier growth / innovation tilt",
      "Higher potential, higher swings",
      "Same EP / TP / SL guardrails",
    ],
  },
];

/** Example UI: choose portfolio style before build (additive; same build API). */
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
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
        Example preview · step 2 of 2
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-wide text-white sm:text-2xl">
        Choose how we complete your portfolio
      </h2>
      <p className="mt-2 text-sm text-terminal-muted">
        Your picks stay in both. This is how a two-option build would look —
        same desk levels, different fill style.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const on = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                on
                  ? "border-terminal-accent bg-terminal-accent/10"
                  : "border-terminal-border bg-terminal-panel hover:border-terminal-accent/40"
              }`}
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
          className="text-xs tracking-[0.2em] text-terminal-muted hover:text-terminal-accent disabled:opacity-40"
        >
          ← BACK TO PICKS
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selected || busy}
          className="rounded-full bg-terminal-accent px-10 py-3.5 text-sm font-bold tracking-[0.18em] text-black disabled:opacity-40"
        >
          {busy ? "BUILDING…" : "BUILD THIS STYLE"}
        </button>
      </div>
    </div>
  );
}
