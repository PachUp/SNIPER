"use client";

import { useAccounts } from "@/components/AccountsProvider";
import { useI18n } from "@/components/LanguageProvider";

/** Compact account chip — always opens name picker (sign in or switch). */
export default function AccountChip({
  onSignIn,
}: {
  onSignIn?: () => void;
}) {
  const { t } = useI18n();
  const { enabled, user, loading } = useAccounts();
  if (loading || !enabled) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="inline-flex min-h-11 items-center rounded-md border border-terminal-accent bg-terminal-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black"
      >
        {t("auth.signIn")}
      </button>
    );
  }

  const label = user.displayName || "Friend";

  return (
    <button
      type="button"
      title={`${label} — tap to switch name`}
      onClick={onSignIn}
      className="inline-flex max-w-[9rem] min-h-11 items-center truncate rounded-md border border-terminal-accent/30 bg-terminal-accent/10 px-3 py-1.5 text-[10px] font-semibold text-terminal-accent"
    >
      {label}
    </button>
  );
}
