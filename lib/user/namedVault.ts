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

/** Names that actually have a saved book (for picker chips). */
export function listVaultNames(): string[] {
  const vault = readVault();
  const names = Object.keys(vault)
    .filter((k) => payloadHasBook(vault[k]))
    .map((k) => vault[k]?.prefs?.displayName || k)
    .filter(Boolean);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
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

/** Persist current working book under a name (if it has holdings). */
export function stashWorkingUnderName(
  name: string,
  payload: CloudPortfolioPayload
): boolean {
  if (!payloadHasBook(payload)) return false;
  saveNamedPayload(name, payload);
  return true;
}
