"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { Field, TextInput, TextArea, Select, SaveButton } from "./fields";

type SaveState = "idle" | "saving" | "saved" | "error";

function blankNews(): NewsItem {
  return {
    id: `n${Date.now()}`,
    tickers: [],
    line: "",
    details: "",
    sentiment: "good",
    source: "",
    sourceUrl: "",
    timestamp: new Date().toISOString(),
  };
}

export default function NewsEditor() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [state, setState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then(setNews);
  }, []);

  function update(id: string, patch: Partial<NewsItem>) {
    setNews((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  async function saveAll() {
    setState("saving");
    try {
      const r = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news }),
      });
      if (!r.ok) throw new Error();
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-terminal-muted">
          One-line simplified headlines. Sentiment drives the green/red highlight.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setNews((p) => [blankNews(), ...p])}
            className="rounded-md border border-terminal-border px-3 py-1.5 text-xs text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
          >
            + Add headline
          </button>
          <SaveButton onClick={saveAll} state={state} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {news.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-terminal-border bg-terminal-panel p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Tickers (comma)">
                <TextInput
                  value={n.tickers.join(", ")}
                  onChange={(e) =>
                    update(n.id, {
                      tickers: e.target.value
                        .split(",")
                        .map((t) => t.trim().toUpperCase())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Sentiment">
                <Select
                  value={n.sentiment}
                  onChange={(e) =>
                    update(n.id, {
                      sentiment: e.target.value as NewsItem["sentiment"],
                    })
                  }
                >
                  <option value="good">good</option>
                  <option value="bad">bad</option>
                </Select>
              </Field>
              <Field label="Source">
                <TextInput
                  value={n.source}
                  onChange={(e) => update(n.id, { source: e.target.value })}
                />
              </Field>
              <Field label="Source URL">
                <TextInput
                  value={n.sourceUrl}
                  onChange={(e) => update(n.id, { sourceUrl: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Headline (one line)">
                <TextArea
                  value={n.line}
                  onChange={(e) => update(n.id, { line: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Details (shown in the pop-up)">
                <TextArea
                  value={n.details ?? ""}
                  onChange={(e) => update(n.id, { details: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-terminal-muted">
                {new Date(n.timestamp).toLocaleString()}
              </span>
              <button
                onClick={() => setNews((p) => p.filter((x) => x.id !== n.id))}
                className="text-xs text-terminal-bad hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
