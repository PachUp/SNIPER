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
import { emptyCloudPayload } from "@/lib/user/types";
import {
  applyCloudPayload,
  readLocalCloudPayload,
  setCloudSyncEnabled,
  scheduleCloudSync,
} from "@/lib/user/syncClient";
import {
  getActiveName,
  loadNamedPayload,
  saveNamedPayload,
  setActiveName,
} from "@/lib/user/namedVault";

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
      const on = Boolean(data.enabled);
      setEnabled(on);
      setBackend(data.backend || "off");

      if (data.user) {
        setUser(data.user);
        if (data.user.displayName) setActiveName(data.user.displayName);
        setCloudSyncEnabled(true);
        return;
      }

      // Demo: cookie may be gone (Netlify cold start) — restore from named vault.
      const active = getActiveName();
      if (on && active) {
        const re = await fetch("/api/auth/name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: active }),
        });
        if (re.ok) {
          const body = (await re.json()) as { user?: AuthUser };
          if (body.user) {
            setUser(body.user);
            const vault = loadNamedPayload(active);
            if (vault.built?.holdings?.length) {
              applyCloudPayload(vault);
            }
            setCloudSyncEnabled(true);
            return;
          }
        }
      }

      setUser(null);
      setCloudSyncEnabled(false);
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
    const active = getActiveName();
    if (active) {
      try {
        saveNamedPayload(active, readLocalCloudPayload());
      } catch {
        /* ignore */
      }
    }
    setCloudSyncEnabled(false);
    await fetch("/api/auth/session", { method: "DELETE" });
    setActiveName(null);
    applyCloudPayload(emptyCloudPayload());
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sniper:portfolio"));
    }
  }, []);

  const hydrateFromCloud = useCallback(async () => {
    const active = getActiveName();
    const vault = active ? loadNamedPayload(active) : null;
    const vaultHas = Boolean(vault?.built?.holdings?.length);

    let cloud: CloudPortfolioPayload | null = null;
    try {
      const res = await fetch("/api/me/portfolio", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { payload?: CloudPortfolioPayload };
        cloud = data.payload ?? null;
      }
    } catch {
      /* named vault is enough for demo */
    }

    const local = readLocalCloudPayload();
    const cloudHas = Boolean(cloud?.built?.holdings?.length);
    const localHas = Boolean(local.built?.holdings?.length);

    if (!vaultHas && !cloudHas && !localHas) return "empty";

    const vaultT = vault ? Date.parse(vault.updatedAt || "") || 0 : 0;
    const cloudT = cloud ? Date.parse(cloud.updatedAt || "") || 0 : 0;
    const localT = Date.parse(local.updatedAt || "") || 0;

    // Newest wins among vault / server / working local.
    const bestT = Math.max(vaultT, cloudT, localT);
    if (vaultHas && vaultT === bestT && vault) {
      applyCloudPayload(vault);
      scheduleCloudSync();
      return "applied_cloud";
    }
    if (cloudHas && cloudT === bestT && cloud) {
      applyCloudPayload(cloud);
      if (active) saveNamedPayload(active, cloud);
      return "applied_cloud";
    }
    if (localHas) {
      if (active) saveNamedPayload(active, local);
      scheduleCloudSync();
      return "kept_local";
    }
    if (vaultHas && vault) {
      applyCloudPayload(vault);
      return "applied_cloud";
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
