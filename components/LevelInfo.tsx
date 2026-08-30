"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Tiny clickable (i) — explains Buy / Sell / Safety exit. Expanded hit slop for iPhone. */
export default function LevelInfo({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label="Info"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/25 text-[8px] font-bold leading-none text-white/55 before:absolute before:-inset-3 before:content-['']"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1.5 w-44 -translate-x-1/2 rounded-md border border-terminal-border bg-black px-2 py-1.5 text-left text-[10px] leading-snug text-white/85 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {tip}
        </span>
      ) : null}
    </span>
  );
}
