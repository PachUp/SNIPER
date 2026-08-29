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
  stashWorkingUnderName,
} from "@/lib/user/namedVault";

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
    const vault = active ? loadNamedPayload(active) : null;
    const local = readLocalCloudPayload();

    let cloud: CloudPortfolioPayload | null = null;
    try {
      const res = await fetch("/api/me/portfolio", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { payload?: CloudPortfolioPayload };
        cloud = data.payload ?? null;
      }
    } catch {
      /* vault is enough for demo */
    }

    type Cand = { src: "vault" | "cloud" | "local"; t: number; p: CloudPortfolioPayload };
    const cands: Cand[] = [];
    if (payloadHasBook(vault) && vault) {
      cands.push({
        src: "vault",
        t: Date.parse(vault.updatedAt || "") || 0,
        p: vault,
      });
    }
    if (payloadHasBook(cloud) && cloud) {
      cands.push({
        src: "cloud",
        t: Date.parse(cloud.updatedAt || "") || 0,
        p: cloud,
      });
    }
    if (payloadHasBook(local)) {
      cands.push({
        src: "local",
        t: Date.parse(local.updatedAt || "") || 0,
        p: local,
      });
    }

    if (cands.length === 0) return "empty";

    // Prefer vault on ties — it’s the durable demo store per name.
    cands.sort((a, b) => {
      if (b.t !== a.t) return b.t - a.t;
      const rank = { vault: 3, local: 2, cloud: 1 } as const;
      return rank[b.src] - rank[a.src];
    });
    const best = cands[0];
    applyCloudPayload(best.p);
    if (active) saveNamedPayload(active, best.p);
    return best.src === "local" ? "kept_local" : "applied_cloud";
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
        // Ensure working book matches this name’s vault when session already exists.
        const name = data.user.displayName || getActiveName();
        if (name) {
          const vault = loadNamedPayload(name);
          const local = readLocalCloudPayload();
          if (payloadHasBook(vault) && !payloadHasBook(local)) {
            applyCloudPayload(vault);
          } else if (payloadHasBook(local)) {
            stashWorkingUnderName(name, local);
          }
        }
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
            const vault = loadNamedPayload(active);
            const local = readLocalCloudPayload();
            if (payloadHasBook(vault)) {
              applyCloudPayload(vault);
            } else if (payloadHasBook(local)) {
              stashWorkingUnderName(active, local);
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
