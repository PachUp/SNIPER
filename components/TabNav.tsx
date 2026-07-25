"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";

const TABS = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/breaking-news", key: "nav.news" },
  { href: "/ideas", key: "nav.ideas" },
  { href: "/snipers", key: "nav.snipers" },
];

export default function TabNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-terminal-border bg-terminal-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm font-black tracking-[0.35em] text-terminal-accent"
        >
          SNIPER
        </Link>

        <nav className="flex gap-1 overflow-x-auto sm:gap-2">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs tracking-[0.18em] transition-colors ${
                  active
                    ? "bg-terminal-accent/10 text-terminal-accent"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {t(tab.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          <a
            href={
              process.env.NEXT_PUBLIC_DESK_URL?.trim() ||
              "http://localhost:3001"
            }
            className="hidden text-xs tracking-[0.25em] text-terminal-muted hover:text-terminal-accent sm:block"
          >
            {t("nav.admin")}
          </a>
        </div>
      </div>
    </header>
  );
}
