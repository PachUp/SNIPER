"use client";

import { useAccounts } from "@/components/AccountsProvider";
import { useI18n } from "@/components/LanguageProvider";
import { setCloudSyncEnabled } from "@/lib/user/syncClient";

/** Compact account chip for tab header. */
export default function AccountChip({
  onSignIn,
}: {
  onSignIn?: () => void;
}) {
  const { t } = useI18n();
  const { enabled, user, loading, signOut } = useAccounts();
  if (loading || !enabled) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="rounded-md border border-terminal-border px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
      >
        {t("auth.signIn")}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={user.email}
      onClick={async () => {
        setCloudSyncEnabled(false);
        await signOut();
      }}
      className="max-w-[7rem] truncate rounded-md border border-terminal-accent/30 bg-terminal-accent/10 px-2 py-1 text-[9px] font-semibold text-terminal-accent"
    >
      {user.displayName || user.email.split("@")[0]}
    </button>
  );
}
