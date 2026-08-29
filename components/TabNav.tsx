"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import AdminLink from "@/components/AdminLink";

const TABS = [
  { href: "/dashboard", key: "nav.dashboard", short: "YOURS" },
  { href: "/breaking-news", key: "nav.news", short: "NEWS" },
  { href: "/ideas", key: "nav.ideas", short: "IDEAS" },
  { href: "/snipers", key: "nav.snipers", short: "HOUSE" },
];

export default function TabNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <header className="z-40 shrink-0 border-b border-terminal-border bg-black/90 backdrop-blur-md safe-px">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="text-sm font-black tracking-[0.3em] text-terminal-accent"
            >
              SNIPER
            </Link>
            <Link
              href="/build"
              className="rounded-md bg-terminal-accent px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-black transition-transform hover:scale-[1.02]"
            >
              <span className="sm:hidden">BUILD</span>
              <span className="hidden sm:inline">{t("build.buildMine")}</span>
            </Link>
          </div>
          <AdminLink />
        </div>

        <nav className="flex w-full gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`min-w-0 flex-1 truncate rounded-md px-1 py-1.5 text-center text-[10px] font-medium tracking-[0.12em] transition-all duration-200 ease-smooth sm:text-[11px] ${
                  active
                    ? "bg-terminal-accent/10 text-terminal-accent"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{t(tab.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
