"use client";

/**
 * Browser vault: full-name → portfolio payload.
 * Primary demo store (works on Netlify without a durable server DB).
 */

import { storageGet, storageSet } from "@/lib/safeStorage";
import type { CloudPortfolioPayload } from "@/lib/user/types";
import { emptyCloudPayload } from "@/lib/user/types";

const VAULT_KEY = "sniper.namedVault.v1";
const ACTIVE_NAME_KEY = "sniper.activeName.v1";

export function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

type VaultFile = Record<string, CloudPortfolioPayload>;

function readVault(): VaultFile {
  try {
    const raw = storageGet(VAULT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as VaultFile;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeVault(vault: VaultFile) {
  storageSet(VAULT_KEY, JSON.stringify(vault));
}

export function payloadHasBook(
  payload: CloudPortfolioPayload | null | undefined
): boolean {
  return Boolean(payload?.built?.holdings?.length);
}

export function getActiveName(): string | null {
  const n = storageGet(ACTIVE_NAME_KEY);
  return n && n.trim() ? n.trim() : null;
}

export function setActiveName(name: string | null) {
  if (!name) {
    storageSet(ACTIVE_NAME_KEY, "");
    return;
  }
  storageSet(ACTIVE_NAME_KEY, name.trim().replace(/\s+/g, " ").slice(0, 80));
}

/** Names that actually have a saved port (for picker chips). */
export function listVaultNames(): string[] {
  const vault = readVault();
  const names = Object.keys(vault)
    .filter((k) => payloadHasBook(vault[k]))
    .map((k) => vault[k]?.prefs?.displayName || k)
    .filter(Boolean);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

/** Peek whether this name already has a built book on this device. */
export function peekNamedBook(name: string): {
  known: boolean;
  count: number;
  displayName: string | null;
} {
  const key = normalizeNameKey(name);
  if (key.length < 2) return { known: false, count: 0, displayName: null };
  const vault = readVault();
  const hit = vault[key];
  if (!payloadHasBook(hit)) {
    return { known: false, count: 0, displayName: null };
  }
  return {
    known: true,
    count: hit.built?.holdings?.length || 0,
    displayName: hit.prefs?.displayName || name.trim(),
  };
}


export function loadNamedPayload(name: string): CloudPortfolioPayload {
  const key = normalizeNameKey(name);
  if (!key) return emptyCloudPayload();
  const vault = readVault();
  const hit = vault[key];
  if (hit && typeof hit === "object") return hit;
  return emptyCloudPayload();
}

export function saveNamedPayload(name: string, payload: CloudPortfolioPayload) {
  const displayName = name.trim().replace(/\s+/g, " ").slice(0, 80);
  const key = normalizeNameKey(displayName);
  if (!key) return;
  const vault = readVault();
  const now = new Date().toISOString();
  vault[key] = {
    ...payload,
    prefs: { ...payload.prefs, displayName },
    // Always bump so this name wins over an empty Netlify server blob.
    updatedAt: now,
  };
  writeVault(vault);
}

/** Drop a name’s saved port from this device vault. */
export function deleteNamedPayload(name: string): boolean {
  const key = normalizeNameKey(name);
  if (!key) return false;
  const vault = readVault();
  if (!(key in vault)) return false;
  delete vault[key];
  writeVault(vault);
  return true;
}

/** Persist current working book under a name (if it has holdings). */
export function stashWorkingUnderName(
  name: string,
  payload: CloudPortfolioPayload
): boolean {
  if (!payloadHasBook(payload)) return false;
  saveNamedPayload(name, payload);
  return true;
}
