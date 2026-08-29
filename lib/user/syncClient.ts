"use client";

/**
 * Client helpers: snapshot localStorage ↔ cloud payload + debounced PUT.
 */

import {
  loadAdded,
  loadEntries,
  loadEntryDates,
  loadPortfolio,
  loadRemoved,
  loadReplaceStack,
  loadSwaps,
  type ReplaceRecord,
} from "@/lib/clientPortfolio";
import { storageGet, storageSet, storageRemove } from "@/lib/safeStorage";
import type { BuiltPortfolio, PortfolioHolding } from "@/lib/types";
import type { CloudPortfolioPayload } from "@/lib/user/types";
import {
  getActiveName,
  saveNamedPayload,
} from "@/lib/user/namedVault";

const KEY = "sniper.portfolio.v1";
const SWAPS_KEY = "sniper.swaps.v1";
const ENTRIES_KEY = "sniper.entries.v1";
const ENTRY_DATES_KEY = "sniper.entryDates.v1";
const REMOVED_KEY = "sniper.removed.v1";
const ADDED_KEY = "sniper.added.v1";
const REPLACE_STACK_KEY = "sniper.replaceStack.v1";
const ENTRY_COACH_KEY = "sniper.entryCoach.v1";
const GUEST_TRUST_KEY = "sniper.guestTrust.v1";
const LOCAL_UPDATED_KEY = "sniper.portfolioUpdatedAt.v1";

let syncTimer: number | null = null;
let syncEnabled = false;

export function setCloudSyncEnabled(on: boolean) {
  syncEnabled = on;
}

export function touchLocalUpdatedAt() {
  storageSet(LOCAL_UPDATED_KEY, new Date().toISOString());
}

export function readLocalCloudPayload(): CloudPortfolioPayload {
  const active = getActiveName();
  return {
    built: loadPortfolio(),
    entries: loadEntries(),
    entryDates: loadEntryDates(),
    swaps: loadSwaps(),
    removed: loadRemoved(),
    added: loadAdded(),
    replaceStack: loadReplaceStack() as ReplaceRecord[],
    prefs: {
      entryCoachDismissed: storageGet(ENTRY_COACH_KEY) === "true",
      guestTrustDismissed: storageGet(GUEST_TRUST_KEY) === "true",
      displayName: active || undefined,
    },
    updatedAt: storageGet(LOCAL_UPDATED_KEY) || new Date(0).toISOString(),
  };
}

/** Apply cloud snapshot into localStorage without wipe-then-rebuild races. */
export function applyCloudPayload(payload: CloudPortfolioPayload) {
  if (payload.built) {
    storageSet(KEY, JSON.stringify(payload.built as BuiltPortfolio));
  } else {
    storageRemove(KEY);
  }
  storageSet(ENTRIES_KEY, JSON.stringify(payload.entries || {}));
  storageSet(ENTRY_DATES_KEY, JSON.stringify(payload.entryDates || {}));
  storageSet(SWAPS_KEY, JSON.stringify(payload.swaps || {}));
  storageSet(REMOVED_KEY, JSON.stringify(payload.removed || []));
  storageSet(ADDED_KEY, JSON.stringify((payload.added || []) as PortfolioHolding[]));
  storageSet(
    REPLACE_STACK_KEY,
    JSON.stringify(payload.replaceStack || [])
  );
  if (payload.prefs?.entryCoachDismissed) {
    storageSet(ENTRY_COACH_KEY, "true");
  } else {
    storageRemove(ENTRY_COACH_KEY);
  }
  if (payload.prefs?.guestTrustDismissed) {
    storageSet(GUEST_TRUST_KEY, "true");
  } else {
    storageRemove(GUEST_TRUST_KEY);
  }
  storageSet(
    LOCAL_UPDATED_KEY,
    payload.updatedAt || new Date().toISOString()
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sniper:portfolio"));
  }
}

export function scheduleCloudSync() {
  if (!syncEnabled || typeof window === "undefined") return;
  touchLocalUpdatedAt();
  if (syncTimer != null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    void pushCloudNow();
  }, 600);
}

export async function pushCloudNow(): Promise<boolean> {
  if (!syncEnabled) return false;
  try {
    const payload = readLocalCloudPayload();
    const active = getActiveName();
    if (active) {
      saveNamedPayload(active, payload);
    }
    const res = await fetch("/api/me/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    // Named vault is enough for demo even if server PUT fails (Netlify FS).
    return res.ok || Boolean(active);
  } catch {
    const active = getActiveName();
    if (active) {
      try {
        saveNamedPayload(active, readLocalCloudPayload());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
