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
  installVaultFlush,
  mirrorActiveVault,
  pushCloudNow,
  readLocalCloudPayload,
  setCloudSyncEnabled,
} from "@/lib/user/syncClient";
import {
  getActiveName,
  loadNamedPayload,
  payloadHasBook,
  saveNamedPayload,
  setActiveName,
} from "@/lib/user/namedVault";
import { pickOwnPort } from "@/lib/user/pickOwnPort";

type AccountsCtx = {
  enabled: boolean;
  backend: string;
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge named vault / server / working book — never let empty wipe a real book. */
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

  useEffect(() => {
    installVaultFlush();
  }, []);

  const hydrateFromCloud = useCallback(async () => {
    const active = getActiveName();
    if (!active) return "skipped";
    const vault = loadNamedPayload(active);
    const local = readLocalCloudPayload();

    let cloud: CloudPortfolioPayload | null = null;
    try {
      const res = await fetch("/api/me/portfolio", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { payload?: CloudPortfolioPayload };
        cloud = data.payload ?? null;
      }
    } catch {
      /* vault is enough when blobs are down */
    }

    const own = pickOwnPort({ name: active, vault, cloud, local });
    if (!own) {
      applyCloudPayload(emptyCloudPayload());
      return "empty";
    }
    applyCloudPayload(own);
    saveNamedPayload(active, own);
    if (payloadHasBook(own)) {
      void pushCloudNow();
    }
    if (cloud && own === cloud) return "applied_cloud";
    return "kept_local";
  }, []);

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
        await hydrateFromCloud();
        return;
      }

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
            setCloudSyncEnabled(true);
            await hydrateFromCloud();
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
  }, [hydrateFromCloud]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    const active = getActiveName();
    if (active) {
      try {
        const cur = readLocalCloudPayload();
        if (payloadHasBook(cur)) saveNamedPayload(active, cur);
        else mirrorActiveVault();
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
