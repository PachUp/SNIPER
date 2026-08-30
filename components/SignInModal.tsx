"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccounts } from "@/components/AccountsProvider";
import {
  applyCloudPayload,
  pushCloudNow,
  readLocalCloudPayload,
  setCloudSyncEnabled,
} from "@/lib/user/syncClient";
import { useI18n } from "@/components/LanguageProvider";
import {
  deleteNamedPayload,
  getActiveName,
  listVaultNames,
  loadNamedPayload,
  normalizeNameKey,
  payloadHasBook,
  peekNamedBook,
  saveNamedPayload,
  setActiveName,
} from "@/lib/user/namedVault";
import { emptyCloudPayload } from "@/lib/user/types";
import type { CloudPortfolioPayload } from "@/lib/user/types";
import { pickOwnPort } from "@/lib/user/pickOwnPort";
import { useIosSheet } from "@/lib/useIosSheet";

export default function SignInModal({
  open,
  onClose,
  required = false,
  stayOnPage = false,
}: {
  open: boolean;
  onClose: () => void;
  reason?: "save" | "return";
  required?: boolean;
  stayOnPage?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { enabled, refresh } = useAccounts();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useIosSheet(open);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setPendingDelete(null);
    const names = listVaultNames();
    setKnown(names);
    const prev = getActiveName();
    setLast(prev);
    setDisplayName("");
    if (names.length === 0) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const peek = useMemo(() => peekNamedBook(displayName), [displayName]);
  const typed = displayName.trim().length >= 2;
  const lastKnown =
    last && last.trim().length >= 2
      ? known.find((n) => normalizeNameKey(n) === normalizeNameKey(last)) ||
        last
      : null;
  const otherNames = lastKnown
    ? known.filter(
        (n) => normalizeNameKey(n) !== normalizeNameKey(lastKnown)
      )
    : known;

  if (!open) return null;

  async function signInWithName(raw?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const name = (raw ?? displayName).trim().replace(/\s+/g, " ");
      if (name.length < 2) throw new Error(t("auth.nameRequired"));

      const prev = getActiveName();
      const working = readLocalCloudPayload();
      if (
        prev &&
        normalizeNameKey(prev) !== normalizeNameKey(name) &&
        payloadHasBook(working)
      ) {
        saveNamedPayload(prev, working);
        await pushCloudNow();
      }

      const res = await fetch("/api/auth/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign in");

      setActiveName(name);
      setCloudSyncEnabled(true);

      let cloud: CloudPortfolioPayload | null = null;
      try {
        const cr = await fetch("/api/me/portfolio", { cache: "no-store" });
        if (cr.ok) {
          const body = (await cr.json()) as {
            payload?: CloudPortfolioPayload;
          };
          cloud = body.payload ?? null;
        }
      } catch {
        /* blobs / session may still be warming */
      }

      const vault = loadNamedPayload(name);
      const own = pickOwnPort({
        name,
        vault,
        cloud,
        local: working,
      });

      let restored = false;
      if (own) {
        applyCloudPayload(own);
        saveNamedPayload(name, own);
        restored = true;
      } else {
        applyCloudPayload(emptyCloudPayload());
      }

      await refresh();
      const hasSaved = restored && payloadHasBook(loadNamedPayload(name));
      onClose();
      window.dispatchEvent(new Event("sniper:portfolio"));
      if (hasSaved) void pushCloudNow();

      if (stayOnPage) {
        if (hasSaved) router.push("/dashboard");
        return;
      }
      if (hasSaved) router.push("/dashboard");
      else router.push("/build");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePort(name: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const active = getActiveName();
      const isActive = Boolean(
        active && normalizeNameKey(active) === normalizeNameKey(name)
      );

      if (isActive) {
        applyCloudPayload(emptyCloudPayload());
        try {
          await fetch("/api/me/portfolio", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: emptyCloudPayload() }),
          });
        } catch {
          /* vault + name DELETE still drop the port */
        }
      }

      deleteNamedPayload(name);

      try {
        await fetch("/api/auth/name", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: name }),
        });
      } catch {
        /* local vault already dropped */
      }

      if (isActive) {
        setActiveName(null);
        setCloudSyncEnabled(false);
        try {
          await fetch("/api/auth/session", { method: "DELETE" });
        } catch {
          /* ignore */
        }
        await refresh();
        window.dispatchEvent(new Event("sniper:portfolio"));
      }

      setKnown(listVaultNames());
      setLast((prev) =>
        prev && normalizeNameKey(prev) === normalizeNameKey(name)
          ? null
          : prev
      );
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove port");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      onClick={!required ? onClose : undefined}
    >
      <div
        className="ios-sheet max-w-md border border-terminal-border bg-terminal-panel px-5 pt-3 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ios-grabber" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
          {t("auth.eyebrow")}
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-wide">
          {required ? t("auth.titleBuild") : t("auth.titleWho")}
        </h2>
        <p className="mt-1.5 text-sm text-terminal-muted">
          {!enabled
            ? t("auth.disabled")
            : required
              ? t("auth.bodyBuild")
              : t("auth.bodyGate")}
        </p>

        {!enabled ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 min-h-12 w-full rounded-xl border border-terminal-border py-3 text-sm text-terminal-muted"
          >
            {t("common.close")}
          </button>
        ) : pendingDelete ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-white">
              {t("auth.deleteConfirm", { name: pendingDelete })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDelete(null)}
                className="min-h-12 flex-1 rounded-xl border border-terminal-border text-sm text-terminal-muted disabled:opacity-40"
              >
                {t("auth.deleteCancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deletePort(pendingDelete)}
                className="min-h-12 flex-1 rounded-xl bg-terminal-bad/20 text-sm font-bold tracking-wider text-terminal-bad disabled:opacity-40"
              >
                {busy ? t("common.loading") : t("auth.deleteRemove")}
              </button>
            </div>
            {error ? (
              <p className="text-xs text-terminal-bad">{error}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2.5">
              {lastKnown ? (
                <div className="flex items-stretch gap-1.5">
                  <DeleteX
                    busy={busy}
                    label={t("auth.deleteAria", { name: lastKnown })}
                    onDelete={() => setPendingDelete(lastKnown)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void signInWithName(lastKnown)}
                    className="min-h-12 min-w-0 flex-1 rounded-xl bg-terminal-accent px-3 py-3 text-sm font-bold tracking-[0.08em] text-black disabled:opacity-40"
                  >
                    {busy
                      ? t("common.loading")
                      : t("auth.continueAs", { name: lastKnown })}
                  </button>
                </div>
              ) : null}

              {otherNames.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-terminal-muted">
                    {t("auth.savedNames")}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {otherNames.slice(0, 20).map((n) => {
                      const meta = peekNamedBook(n);
                      return (
                        <div key={n} className="flex items-stretch gap-1.5">
                          <DeleteX
                            busy={busy}
                            label={t("auth.deleteAria", { name: n })}
                            onDelete={() => setPendingDelete(n)}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void signInWithName(n)}
                            className="flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-terminal-border px-3.5 py-2.5 text-left text-sm text-white disabled:opacity-40"
                          >
                            <span className="truncate font-semibold">{n}</span>
                            {meta.count > 0 ? (
                              <span className="ms-2 shrink-0 text-[11px] text-terminal-accent">
                                {meta.count}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <input
                ref={inputRef}
                type="text"
                name="name"
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                inputMode="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void signInWithName();
                }}
                placeholder={t("auth.namePlaceholder")}
                className="min-h-12 w-full rounded-xl border border-terminal-border bg-black px-3.5 py-3 text-base outline-none focus:border-terminal-accent"
              />

              {typed ? (
                <p
                  className={`text-xs ${
                    peek.known ? "text-terminal-accent" : "text-terminal-muted"
                  }`}
                >
                  {peek.known
                    ? t("auth.recognizeReturning", { n: peek.count })
                    : t("auth.recognizeNew")}
                </p>
              ) : null}

              {typed || !lastKnown ? (
                <button
                  type="button"
                  disabled={busy || displayName.trim().length < 2}
                  onClick={() => void signInWithName()}
                  className="min-h-12 w-full rounded-xl bg-terminal-accent py-3 text-sm font-bold tracking-[0.14em] text-black disabled:opacity-40"
                >
                  {busy
                    ? t("common.loading")
                    : peek.known
                      ? t("auth.openSaved")
                      : t("auth.continueNew")}
                </button>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 text-xs text-terminal-bad">{error}</p>
            ) : null}

            {!required ? (
              <button
                type="button"
                onClick={onClose}
                className="mt-3 min-h-11 w-full text-sm tracking-wider text-terminal-muted"
              >
                {t("auth.skipGuest")}
              </button>
            ) : (
              <p className="mt-4 text-center text-[10px] tracking-wide text-terminal-muted">
                {t("auth.buildRequiredHint")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DeleteX({
  busy,
  label,
  onDelete,
}: {
  busy: boolean;
  label: string;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-terminal-border text-lg leading-none text-terminal-muted disabled:opacity-40"
    >
      <span aria-hidden>×</span>
    </button>
  );
}
