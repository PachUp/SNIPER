/**
 * Durable name → port store on Netlify Blobs.
 * Live FS is read-only; without this, device 2 cannot load device 1’s port.
 * Sized for ~20 named ports (each ~a 12-stock book).
 */

import type { CloudPortfolioPayload } from "@/lib/user/types";

export type BlobSessionRow = {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  nameKey: string;
  expiresAt: number;
};

export type BlobPortfolioRow = {
  userId: string;
  email: string;
  displayName: string;
  nameKey: string;
  payload: CloudPortfolioPayload;
  updatedAt: string;
};

export type AccountsFile = {
  sessions: BlobSessionRow[];
  portfolios: BlobPortfolioRow[];
};

const STORE = "sniper-accounts";
const KEY = "user_accounts_v1";

function isFile(data: unknown): data is AccountsFile {
  if (!data || typeof data !== "object") return false;
  const o = data as AccountsFile;
  return Array.isArray(o.sessions) && Array.isArray(o.portfolios);
}

export async function readAccountsBlob(): Promise<AccountsFile | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore(STORE, { consistency: "strong" });
    const data = await store.get(KEY, { type: "json" });
    if (!isFile(data)) return null;
    return {
      sessions: data.sessions,
      portfolios: data.portfolios,
    };
  } catch {
    return null;
  }
}

export async function writeAccountsBlob(file: AccountsFile): Promise<boolean> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore(STORE, { consistency: "strong" });
    await store.setJSON(KEY, {
      sessions: file.sessions,
      portfolios: file.portfolios,
    });
    return true;
  } catch {
    return false;
  }
}
