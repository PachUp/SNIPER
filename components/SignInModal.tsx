"use client";

import { useEffect, useMemo, useState } from "react";
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
  getActiveName,
  listVaultNames,
  loadNamedPayload,
  normalizeNameKey,
  payloadHasBook,
  peekNamedBook,
  saveNamedPayload,
  setActiveName,
  stashWorkingUnderName,
} from "@/lib/user/namedVault";
import { emptyCloudPayload } from "@/lib/user/types";

export default function SignInModal({
  open,
  onClose,
  reason = "save",
  required = false,
  stayOnPage = false,
}: {
  open: boolean;
  onClose: () => void;
  reason?: "save" | "return";
  /** Build screen: name is required — no guest skip. */
  required?: boolean;
  /** Stay on current page after sign-in (build gate). */
  stayOnPage?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { enabled, refresh } = useAccounts();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [known, setKnown] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDisplayName("");
    setError(null);
    setInfo(null);
    setBusy(false);
    setKnown(listVaultNames());
  }, [open]);

  const peek = useMemo(() => peekNamedBook(displayName), [displayName]);
  const typed = displayName.trim().length >= 2;

  if (!open) return null;

  async function signInWithName() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const name = displayName.trim().replace(/\s+/g, " ");
      if (name.length < 2) throw new Error(t("auth.nameRequired"));

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

      let restored = false;
      if (vaultHas) {
        applyCloudPayload(vault);
        saveNamedPayload(name, vault);
        setInfo(t("auth.mergedCloud"));
        restored = true;
      } else if (localHas && (sameName || !prev)) {
        stashWorkingUnderName(name, local);
        setInfo(t("auth.mergedLocal"));
        restored = true;
      } else {
        applyCloudPayload(emptyCloudPayload());
        setInfo(t("auth.newNameEmpty"));
      }

      await refresh();
      await pushCloudNow();
      setKnown(listVaultNames());

      window.setTimeout(() => {
        onClose();
        window.dispatchEvent(new Event("sniper:portfolio"));
        const hasSaved =
          restored && payloadHasBook(loadNamedPayload(name));
        if (stayOnPage) {
          // Build gate: returning names go to YOURS; new names stay to BUILD.
          if (hasSaved) router.push("/dashboard");
          return;
        }
        if (hasSaved) {
          router.push("/dashboard");
        } else {
          router.push("/build");
        }
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

              {known.length > 0 ? (
                <div className="pt-1">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-terminal-muted">
                    {t("auth.savedNames")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {known.slice(0, 12).map((n) => {
                      const meta = peekNamedBook(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDisplayName(n)}
                          className="rounded-full border border-terminal-border px-2.5 py-1 text-[10px] text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
                        >
                          {n}
                          {meta.count > 0 ? ` · ${meta.count}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={busy || displayName.trim().length < 2}
                onClick={() => void signInWithName()}
                className="w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.14em] text-black disabled:opacity-40"
              >
                {busy
                  ? t("common.loading")
                  : peek.known
                    ? t("auth.openSaved")
                    : t("auth.continueNew")}
              </button>
            </div>

            {info ? (
              <p className="mt-3 text-xs text-terminal-muted">{info}</p>
            ) : null}
            {error ? (
              <p className="mt-3 text-xs text-terminal-bad">{error}</p>
            ) : null}

            {!required ? (
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full text-xs tracking-wider text-terminal-muted hover:text-terminal-accent"
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
