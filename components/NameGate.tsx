"use client";

import { useEffect, useRef, useState } from "react";
import { useAccounts } from "@/components/AccountsProvider";
import SignInModal from "@/components/SignInModal";

/**
 * Every time the app loads (fresh visit / refresh), open the name gate
 * so demo users pick a new or returning name before continuing.
 */
export default function NameGate() {
  const { enabled, loading } = useAccounts();
  const [open, setOpen] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (loading || !enabled || asked.current) return;
    asked.current = true;
    setOpen(true);
  }, [loading, enabled]);

  if (!enabled) return null;

  return (
    <SignInModal
      open={open}
      reason="return"
      onClose={() => setOpen(false)}
    />
  );
}
