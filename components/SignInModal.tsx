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
  saveNamedPayload,
  setActiveName,
} from "@/lib/user/namedVault";

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
  const { enabled, refresh, hydrateFromCloud } = useAccounts();
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
      const vaultHas = Boolean(vault.built?.holdings?.length);
      const local = readLocalCloudPayload();
      const localHas = Boolean(local.built?.holdings?.length);

      if (vaultHas) {
        applyCloudPayload(vault);
        setInfo(t("auth.mergedCloud"));
      } else if (localHas) {
        saveNamedPayload(name, local);
        setInfo(t("auth.mergedLocal"));
      }

      await refresh();
      const merge = await hydrateFromCloud();
      if (!vaultHas && merge === "applied_cloud") {
        setInfo(t("auth.mergedCloud"));
      }
      await pushCloudNow();

      window.setTimeout(() => {
        onClose();
        window.dispatchEvent(new Event("sniper:portfolio"));
      }, 400);
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
