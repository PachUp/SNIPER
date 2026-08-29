"use client";

import { useState } from "react";
import { useAccounts } from "@/components/AccountsProvider";
import { setCloudSyncEnabled, pushCloudNow } from "@/lib/user/syncClient";
import { useI18n } from "@/components/LanguageProvider";

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
  const { enabled, backend, refresh, hydrateFromCloud } = useAccounts();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "magic" | "done">("email");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!open) return null;

  async function requestLink() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start sign-in");
      if (data.mode === "otp") {
        setStep("otp");
        setDevCode(typeof data.devCode === "string" ? data.devCode : null);
        setInfo(data.message || t("auth.otpSent"));
      } else {
        setStep("magic");
        setInfo(data.message || t("auth.magicSent"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wrong code");
      await refresh();
      setCloudSyncEnabled(true);
      const merge = await hydrateFromCloud();
      await pushCloudNow();
      setStep("done");
      setInfo(
        merge === "applied_cloud"
          ? t("auth.mergedCloud")
          : merge === "kept_local"
            ? t("auth.mergedLocal")
            : t("auth.signedIn")
      );
      window.setTimeout(() => {
        onClose();
        window.dispatchEvent(new Event("sniper:portfolio"));
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed");
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
          {!enabled
            ? t("auth.disabled")
            : reason === "return"
              ? t("auth.bodyReturn")
              : t("auth.bodySave")}
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
            {step === "email" || step === "magic" ? (
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  className="w-full rounded-lg border border-terminal-border bg-black px-3 py-2 text-sm outline-none focus:border-terminal-accent"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full rounded-lg border border-terminal-border bg-black px-3 py-2 text-sm outline-none focus:border-terminal-accent"
                />
                <button
                  type="button"
                  disabled={busy || !email.includes("@")}
                  onClick={() => void requestLink()}
                  className="w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.14em] text-black disabled:opacity-40"
                >
                  {busy
                    ? t("common.loading")
                    : backend === "local"
                      ? t("auth.sendCode")
                      : t("auth.sendLink")}
                </button>
              </div>
            ) : null}

            {step === "otp" ? (
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("auth.codePlaceholder")}
                  className="w-full rounded-lg border border-terminal-border bg-black px-3 py-2 text-sm outline-none focus:border-terminal-accent"
                />
                {devCode ? (
                  <p className="text-[11px] text-terminal-accent">
                    {t("auth.devCode", { code: devCode })}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busy || code.trim().length < 4}
                  onClick={() => void verifyOtp()}
                  className="w-full rounded-lg bg-terminal-accent py-2.5 text-sm font-bold tracking-[0.14em] text-black disabled:opacity-40"
                >
                  {busy ? t("common.loading") : t("auth.verify")}
                </button>
              </div>
            ) : null}

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
