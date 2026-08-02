import Link from "next/link";

const LINKS = [
  { href: "/legal/disclaimer", label: "Disclaimer" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.35em] text-terminal-accent hover:text-terminal-orange"
        >
          ← SNIPER
        </Link>
        <nav className="flex gap-3 text-xs">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-terminal-muted hover:text-terminal-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-terminal-border bg-terminal-panel p-6">
        <div className="mb-6 rounded-lg border border-terminal-accent/30 bg-terminal-accent/10 px-4 py-3 text-xs text-terminal-accent">
          FRIENDS / TESTERS ONLY — draft product. This legal text is a non-binding
          placeholder and must be finalized by a qualified attorney before any
          public launch. It is not legal advice. SNIPER is general information,
          not investment advice.
        </div>
        <article className="prose-invert space-y-4 text-sm leading-relaxed text-terminal-text">
          {children}
        </article>
      </div>
    </div>
  );
}
