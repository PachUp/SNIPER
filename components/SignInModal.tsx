"use client";

import { useState } from "react";
import { useAccounts } from "@/components/AccountsProvider";
import {
  applyCloudPayload,
  pushCloudNow,
  readLocalCloudPayload,
  setCloudSyncEnabled,
} from "@/lib/user/syncClient";
import { useI18n } from "@/components/LanguageProvider";
import {
  getActiveName,
  listVaultNames,
  loadNamedPayload,
  normalizeNameKey,
  payloadHasBook,
  saveNamedPayload,
  setActiveName,
  stashWorkingUnderName,
} from "@/lib/user/namedVault";
import { emptyCloudPayload } from "@/lib/user/types";

export default function SignInModal({
  open,
  onClose,
  reason = "save",
}: {
  open: boolean;
  onClose: () => void;
  reason?: "save" | "return";
}) {
  const { t } = useI18n();
  const { enabled, refresh } = useAccounts();
  const [displayName, setDisplayName] = useState(getActiveName() || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const known = listVaultNames();

  if (!open) return null;

  async function signInWithName() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const name = displayName.trim().replace(/\s+/g, " ");
      if (name.length < 2) throw new Error(t("auth.nameRequired"));

      // Park the current book under the previous name before switching.
      const prev = getActiveName();
      const working = readLocalCloudPayload();
      if (
        prev &&
        normalizeNameKey(prev) !== normalizeNameKey(name) &&
        payloadHasBook(working)
      ) {
        saveNamedPayload(prev, working);
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

      const vault = loadNamedPayload(name);
      const local = readLocalCloudPayload();
      const vaultHas = payloadHasBook(vault);
      const localHas = payloadHasBook(local);
      const sameName =
        !prev || normalizeNameKey(prev) === normalizeNameKey(name);

      if (vaultHas) {
        // Returning demo user — restore their saved book for this name.
        applyCloudPayload(vault);
        setInfo(t("auth.mergedCloud"));
      } else if (localHas && (sameName || !prev)) {
        // First save for this name: claim the working / guest book.
        stashWorkingUnderName(name, local);
        setInfo(t("auth.mergedLocal"));
      } else if (localHas && prev && !sameName) {
        // Switched to a new name with no vault — start clean (old book parked).
        applyCloudPayload(emptyCloudPayload());
        setInfo(t("auth.newNameEmpty"));
      } else {
        applyCloudPayload(emptyCloudPayload());
      }

      await refresh();
      // Push this name’s book to the server (best-effort). Vault already has it.
      await pushCloudNow();

      window.setTimeout(() => {
        onClose();
        window.dispatchEvent(new Event("sniper:portfolio"));
      }, 350);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-panel p-5 shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terminal-accent">
          {t("auth.eyebrow")}
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-wide">
          {reason === "return" ? t("auth.titleReturn") : t("auth.titleSave")}
        </h2>
        <p className="mt-1.5 text-sm text-terminal-muted">
          {!enabled ? t("auth.disabled") : t("auth.bodyName")}
        </p>

        {!enabled ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-lg border border-terminal-border py-2.5 text-sm text-terminal-muted"
          >
            {t("common.close")}
          </button>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              <input
                type="text"
                autoComplete="name"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void signInWithName();
                }}
                placeholder={t("auth.namePlaceholder")}
                className="w-full rounded-lg border border-terminal-border bg-black px-3 py-2 text-sm outline-none focus:border-terminal-accent"
              />
              {known.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {known.slice(0, 8).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDisplayName(n)}
                      className="rounded-full border border-terminal-border px-2.5 py-1 text-[10px] text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                disabled={busy || displayName.trim().length < 2}
                onClick={() => void signInWithName()}
                className="w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.14em] text-black disabled:opacity-40"
              >
                {busy ? t("common.loading") : t("auth.continueName")}
              </button>
            </div>

            {info ? (
              <p className="mt-3 text-xs text-terminal-muted">{info}</p>
            ) : null}
            {error ? (
              <p className="mt-3 text-xs text-terminal-bad">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full text-xs tracking-wider text-terminal-muted hover:text-terminal-accent"
            >
              {t("auth.skipGuest")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
