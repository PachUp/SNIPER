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
        className="rounded-md border border-terminal-accent bg-terminal-accent px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-black hover:brightness-110"
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
      className="max-w-[7rem] truncate rounded-md border border-terminal-accent/30 bg-terminal-accent/10 px-2 py-1 text-[9px] font-semibold text-terminal-accent"
    >
      {label}
    </button>
  );
}
