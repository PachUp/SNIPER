"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StocksEditor from "./StocksEditor";
import FamousEditor from "./FamousEditor";
import IdeasEditor from "./IdeasEditor";
import NewsEditor from "./NewsEditor";
import HouseEditor from "./HouseEditor";
import AuditLog from "./AuditLog";

const SECTIONS = [
  { id: "famous", label: "FAMOUS" },
  { id: "stocks", label: "LEVELS" },
  { id: "ideas", label: "IDEAS" },
  { id: "news", label: "NEWS" },
  { id: "house", label: "BOOK" },
  { id: "audit", label: "AUDIT" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function AdminPanel() {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("famous");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-5xl bg-black px-3 py-4 sm:px-4 sm:py-6 safe-pt safe-pb">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-[0.2em] text-terminal-accent sm:text-lg">
            SNIPER ADMIN
          </h1>
          <p className="mt-0.5 text-[11px] leading-snug text-terminal-muted sm:text-xs">
            LEVELS = auto-picks · BOOK = house holdings · Ideas pull from LEVELS
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-3 text-xs tracking-[0.15em] text-terminal-muted hover:text-terminal-accent"
          >
            SITE
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 items-center rounded-md border border-terminal-border px-3 text-xs text-terminal-muted hover:border-terminal-bad hover:text-terminal-bad"
          >
            LOG OUT
          </button>
        </div>
      </header>

      <nav className="-mx-3 mb-4 flex gap-1.5 overflow-x-auto border-b border-terminal-border px-3 pb-3 sm:mx-0 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:px-0">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`shrink-0 rounded-md px-3 py-2.5 text-[11px] tracking-[0.12em] transition-colors sm:text-xs sm:tracking-[0.15em] ${
              section === s.id
                ? "bg-terminal-accent/15 text-terminal-accent"
                : "text-terminal-muted hover:text-terminal-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {section === "famous" && <FamousEditor />}
      {section === "stocks" && <StocksEditor />}
      {section === "ideas" && <IdeasEditor />}
      {section === "news" && <NewsEditor />}
      {section === "house" && <HouseEditor />}
      {section === "audit" && <AuditLog />}
    </main>
  );
}
