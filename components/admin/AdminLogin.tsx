"use client";

import Link from "next/link";

/**
 * Native form POST → Set-Cookie + redirect.
 * More reliable on iOS Safari than fetch() + location.assign().
 */
export default function AdminLogin({
  loginFailed = false,
  passwordEnvSet = true,
  buildStamp = "local",
}: {
  loginFailed?: boolean;
  passwordEnvSet?: boolean;
  buildStamp?: string;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 safe-pt safe-pb">
      <Link
        href="/"
        className="absolute top-0 start-0 z-10 inline-flex min-h-11 items-center px-4 text-xs tracking-[0.35em] text-terminal-muted hover:text-terminal-accent safe-pt"
      >
        ← SNIPER
      </Link>
      <form
        method="POST"
        action="/api/admin/login"
        className="w-full max-w-sm rounded-xl border border-terminal-border bg-terminal-panel p-5 sm:p-6"
      >
        <h1 className="text-lg font-bold tracking-[0.2em]">ADMIN ACCESS</h1>
        <p className="mt-1 text-xs text-terminal-muted">
          Phone or desktop — edit levels, alternatives, ideas, news, and the
          house book.
        </p>

        {!passwordEnvSet ? (
          <p className="mt-3 rounded-lg border border-terminal-bad/40 bg-terminal-bad/10 px-3 py-2 text-[11px] leading-relaxed text-terminal-bad">
            This live deploy has no{" "}
            <span className="font-semibold text-terminal-text">
              ADMIN_PASSWORD
            </span>{" "}
            environment variable. Your local password will not work here. In
            Netlify → Site configuration → Environment variables, add{" "}
            <span className="font-semibold text-terminal-text">
              ADMIN_PASSWORD
            </span>
            , then Trigger deploy.
          </p>
        ) : null}

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          placeholder="Password"
          className="mt-4 w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-3 text-base outline-none focus:border-terminal-accent"
        />
        {loginFailed ? (
          <p className="mt-2 text-xs leading-relaxed text-terminal-bad">
            Incorrect password for this site
            {!passwordEnvSet
              ? " (ADMIN_PASSWORD is not set on Netlify)."
              : "."}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-4 min-h-12 w-full rounded-lg bg-terminal-accent py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg"
        >
          ENTER
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-terminal-muted">
          Live password = Netlify env ADMIN_PASSWORD · Local = .env.local
        </p>
        <p className="mt-1 text-center text-[9px] tracking-wider text-terminal-muted/70">
          build {buildStamp}
        </p>
      </form>
    </main>
  );
}
