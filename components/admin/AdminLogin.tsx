"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      router.replace("/admin");
    } else {
      setError(true);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="absolute top-6 left-6 text-xs tracking-[0.35em] text-terminal-muted hover:text-terminal-accent"
      >
        ← SNIPER
      </Link>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-terminal-border bg-terminal-panel p-6"
      >
        <h1 className="text-lg font-bold tracking-[0.2em]">ADMIN ACCESS</h1>
        <p className="mt-1 text-xs text-terminal-muted">
          Desk-only controls for levels, alternatives, ideas, news and the house
          book.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-4 w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-sm outline-none focus:border-terminal-accent"
          autoFocus
        />
        {error && (
          <p className="mt-2 text-xs text-terminal-bad">Incorrect password.</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.2em] text-terminal-bg disabled:opacity-50"
        >
          {busy ? "…" : "ENTER"}
        </button>
        <p className="mt-3 text-center text-[10px] text-terminal-muted">
          Set ADMIN_PASSWORD in .env.local (do not use a shared default in production)
        </p>
      </form>
    </main>
  );
}
