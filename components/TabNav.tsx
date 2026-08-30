"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import AdminLink from "@/components/AdminLink";
import AccountChip from "@/components/AccountChip";
import SignInModal from "@/components/SignInModal";

const TABS = [
  { href: "/dashboard", key: "nav.dashboard", short: "MY PORT" },
  { href: "/breaking-news", key: "nav.news", short: "NEWS" },
  { href: "/ideas", key: "nav.ideas", short: "IDEAS" },
  { href: "/snipers", key: "nav.snipers", short: "HOUSE" },
];

export default function TabNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-terminal-border bg-black safe-pt safe-px">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 pb-1.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center px-0.5 text-sm font-black tracking-[0.3em] text-terminal-accent"
            >
              SNIPER
            </Link>
            <Link
              href="/build"
              className="inline-flex min-h-11 items-center rounded-md bg-terminal-accent px-3.5 py-2 text-[11px] font-bold tracking-[0.1em] text-black active:opacity-90"
            >
              <span className="sm:hidden">BUILD</span>
              <span className="hidden sm:inline">{t("build.buildMine")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <AccountChip onSignIn={() => setSignInOpen(true)} />
            <AdminLink />
          </div>
        </div>

        <nav className="flex w-full gap-1" aria-label="Main">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-center truncate rounded-md px-1 py-2 text-center text-[11px] font-medium tracking-[0.12em] ${
                  active
                    ? "bg-terminal-accent/15 text-terminal-accent"
                    : "text-terminal-muted"
                }`}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{t(tab.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <SignInModal
        open={signInOpen}
        reason="return"
        onClose={() => setSignInOpen(false)}
      />
    </header>
  );
}
