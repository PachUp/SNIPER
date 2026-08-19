"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: password.trim() }),
      });
      if (res.ok) {
        // Full navigation so the httpOnly session cookie is sent on /admin.
        window.location.assign("/admin");
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 safe-pt safe-pb">
      <Link
        href="/"
        className="absolute top-0 start-0 z-10 inline-flex min-h-11 items-center px-4 text-xs tracking-[0.35em] text-terminal-muted hover:text-terminal-accent safe-pt"
      >
        ← SNIPER
      </Link>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-terminal-border bg-terminal-panel p-5 sm:p-6"
      >
        <h1 className="text-lg font-bold tracking-[0.2em]">ADMIN ACCESS</h1>
        <p className="mt-1 text-xs text-terminal-muted">
          Phone or desktop — edit levels, alternatives, ideas, news, and the
          house book.
        </p>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-4 w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-3 text-base outline-none focus:border-terminal-accent"
        />
        {error && (
          <p className="mt-2 text-xs leading-relaxed text-terminal-bad">
            Incorrect password for this site. On the live site, set{" "}
            <span className="text-terminal-text">ADMIN_PASSWORD</span> in
            Netlify → Site settings → Environment variables, then trigger a
            redeploy. Local uses <span className="text-terminal-text">.env.local</span>.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 min-h-12 w-full rounded-lg bg-terminal-accent py-3 text-sm font-bold tracking-[0.2em] text-terminal-bg disabled:opacity-50"
        >
          {busy ? "…" : "ENTER"}
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-terminal-muted">
          Bookmark sniper-proj.netlify.app/admin on your phone for quick access.
          Password: Netlify env ADMIN_PASSWORD (local: .env.local).
        </p>
      </form>
    </main>
  );
}
