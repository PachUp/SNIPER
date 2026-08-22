"use client";

import Link from "next/link";
import { useState } from "react";
import BuildOptionPicker, {
  type BuildStyle,
} from "@/components/BuildOptionPicker";
import PortfolioRiskPanel from "@/components/PortfolioRiskPanel";

/** Static example page — no build required. Shows positioning UI mockups. */
export default function PreviewPage() {
  const [style, setStyle] = useState<BuildStyle | null>("broad");

  return (
    <main className="mx-auto min-h-[100dvh] max-w-4xl bg-black px-4 py-8 safe-pt safe-pb">
      <header className="mb-8 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.35em] text-terminal-accent"
        >
          SNIPER
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terminal-muted">
          Example UI only
        </p>
      </header>

      <p className="mb-10 max-w-xl text-sm text-terminal-muted">
        Broad vs Growth uses Finviz industries from StockAnalysis: growth names
        (software, semis, biotech…), broad names (utilities, banks, REITs,
        energy…), and shared exceptions (credit cards, big pharma, restaurants…).
      </p>

      <section className="mb-14">
        <BuildOptionPicker
          selected={style}
          onSelect={setStyle}
          onBack={() => setStyle(null)}
          onConfirm={() => {
            window.location.assign("/dashboard");
          }}
        />
      </section>

      <section>
        <PortfolioRiskPanel holdings={[]} example />
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-xs tracking-wider text-terminal-muted">
        <Link href="/build" className="hover:text-terminal-accent">
          → Try on /build
        </Link>
        <Link href="/dashboard" className="hover:text-terminal-accent">
          → See on /dashboard
        </Link>
      </div>
    </main>
  );
}
