"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/types";

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit", { cache: "no-store" });
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-[0.15em] text-terminal-text">
            AUDIT LOG
          </h2>
          <p className="text-xs text-terminal-muted">
            Every admin change, newest first. Retains the last 500 entries.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-md border border-terminal-border px-3 py-1.5 text-xs text-terminal-muted hover:text-terminal-accent"
        >
          REFRESH
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-terminal-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-terminal-muted">No changes recorded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-terminal-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-terminal-panel text-terminal-muted">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={`${e.time}-${i}`}
                  className="border-t border-terminal-border"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-terminal-muted">
                    {new Date(e.time).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-terminal-accent">
                    {e.action}
                  </td>
                  <td className="px-3 py-2 text-terminal-text">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
