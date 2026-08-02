"use client";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-terminal-border bg-terminal-bg px-2 py-1.5 text-sm outline-none focus:border-terminal-accent";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input {...props} className={inputCls} />;
}

export function NumberInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input type="number" step="0.01" {...props} className={inputCls} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return <textarea {...props} className={`${inputCls} min-h-[70px]`} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return <select {...props} className={inputCls} />;
}

export function SaveButton({
  onClick,
  state,
}: {
  onClick: () => void;
  state: "idle" | "saving" | "saved" | "error";
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
      ? "Saved ✓"
      : state === "error"
      ? "Error"
      : "Save";
  return (
    <button
      onClick={onClick}
      disabled={state === "saving"}
      className={`rounded-md px-4 py-1.5 text-xs font-bold tracking-wider transition-colors ${
        state === "saved"
          ? "bg-terminal-good/20 text-terminal-good"
          : state === "error"
          ? "bg-terminal-bad/20 text-terminal-bad"
          : "bg-terminal-accent text-terminal-bg"
      }`}
    >
      {label}
    </button>
  );
}
