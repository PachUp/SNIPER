"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, CloudPortfolioPayload } from "@/lib/user/types";
import {
  applyCloudPayload,
  readLocalCloudPayload,
  scheduleCloudSync,
} from "@/lib/user/syncClient";

type AccountsCtx = {
  enabled: boolean;
  backend: string;
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** After login: merge cloud vs local. */
  hydrateFromCloud: () => Promise<"applied_cloud" | "kept_local" | "empty" | "skipped">;
};

const Ctx = createContext<AccountsCtx>({
  enabled: false,
  backend: "off",
  user: null,
  loading: true,
  refresh: async () => undefined,
  signOut: async () => undefined,
  hydrateFromCloud: async () => "skipped",
});

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [backend, setBackend] = useState("off");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await res.json()) as {
        enabled?: boolean;
        backend?: string;
        user?: AuthUser | null;
      };
      setEnabled(Boolean(data.enabled));
      setBackend(data.backend || "off");
      setUser(data.user ?? null);
    } catch {
      setEnabled(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
  }, []);

  const hydrateFromCloud = useCallback(async () => {
    const res = await fetch("/api/me/portfolio", { cache: "no-store" });
    if (res.status === 401 || res.status === 501) return "skipped";
    if (!res.ok) return "skipped";
    const data = (await res.json()) as { payload?: CloudPortfolioPayload };
    const cloud = data.payload;
    if (!cloud) return "empty";

    const local = readLocalCloudPayload();
    const cloudHas = Boolean(cloud.built?.holdings?.length);
    const localHas = Boolean(local.built?.holdings?.length);

    if (!cloudHas && !localHas) return "empty";

    if (cloudHas && localHas) {
      const cloudT = Date.parse(cloud.updatedAt || "") || 0;
      const localT = Date.parse(local.updatedAt || "") || 0;
      if (localT > cloudT) {
        scheduleCloudSync();
        return "kept_local";
      }
    }

    if (cloudHas) {
      applyCloudPayload(cloud);
      return "applied_cloud";
    }

    if (localHas) {
      scheduleCloudSync();
      return "kept_local";
    }
    return "empty";
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      backend,
      user,
      loading,
      refresh,
      signOut,
      hydrateFromCloud,
    }),
    [enabled, backend, user, loading, refresh, signOut, hydrateFromCloud]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccounts() {
  return useContext(Ctx);
}
