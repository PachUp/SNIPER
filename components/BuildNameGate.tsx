"use client";

import { useEffect, useState } from "react";
import { useAccounts } from "@/components/AccountsProvider";
import SignInModal from "@/components/SignInModal";

/** Require / validate a full name before using BUILD. */
export default function BuildNameGate() {
  const { enabled, loading, user } = useAccounts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !enabled) {
      setOpen(false);
      return;
    }
    setOpen(!user);
  }, [loading, enabled, user]);

  if (!enabled) return null;

  return (
    <SignInModal
      open={open}
      reason="save"
      required
      stayOnPage
      onClose={() => setOpen(false)}
    />
  );
}
