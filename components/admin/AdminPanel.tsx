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
  { id: "famous", label: "FAMOUS PICKS" },
  { id: "stocks", label: "LEVELS & STOCKS" },
  { id: "ideas", label: "IDEAS" },
  { id: "news", label: "BREAKING NEWS" },
  { id: "house", label: "SNIPERS BOOK" },
  { id: "audit", label: "AUDIT LOG" },
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
    <main className="mx-auto min-h-screen max-w-5xl bg-black px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-[0.2em] text-terminal-accent">
            SNIPER ADMIN
          </h1>
          <p className="text-xs text-terminal-muted">
            LEVELS = auto-picks · SNIPERS BOOK = executed house holdings · Ideas
            pull from LEVELS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs tracking-[0.2em] text-terminal-muted hover:text-terminal-accent"
          >
            VIEW SITE
          </Link>
          <button
            onClick={logout}
            className="rounded-md border border-terminal-border px-3 py-1.5 text-xs text-terminal-muted hover:border-terminal-bad hover:text-terminal-bad"
          >
            LOG OUT
          </button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-terminal-border pb-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`rounded-md px-3 py-1.5 text-xs tracking-[0.15em] transition-colors ${
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
