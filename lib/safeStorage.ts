/**
 * localStorage wrapper that survives Safari private mode / in-app browsers
 * by mirroring to sessionStorage and never throwing into the UI.
 */

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "quota" | "unknown" };

function canUse(store: Storage | undefined): store is Storage {
  if (!store) return false;
  try {
    const k = "__sniper_probe__";
    store.setItem(k, "1");
    store.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return canUse(window.localStorage) || canUse(window.sessionStorage);
}

export function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (canUse(window.localStorage)) {
      const v = window.localStorage.getItem(key);
      if (v != null) return v;
    }
  } catch {
    /* fall through */
  }
  try {
    if (canUse(window.sessionStorage)) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function storageSet(key: string, value: string): StorageWriteResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable" };
  }
  let wrote = false;
  let quota = false;
  try {
    if (canUse(window.localStorage)) {
      window.localStorage.setItem(key, value);
      wrote = true;
    }
  } catch (e) {
    const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
    if (name === "QuotaExceededError") quota = true;
  }
  try {
    if (canUse(window.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
      wrote = true;
    }
  } catch (e) {
    const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
    if (name === "QuotaExceededError") quota = true;
  }
  if (wrote) return { ok: true };
  return { ok: false, reason: quota ? "quota" : "unavailable" };
}

export function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}
