/**
 * Phase 2 accounts — demo defaults to name-based local store (no email).
 * - local: full-name sign-in + file/memory + browser named vault
 * - supabase: reserved for later email magic-link
 * - off: guest-only
 */
export type AccountsBackend = "supabase" | "local" | "off";

export function accountsBackend(): AccountsBackend {
  const forced = process.env.SNIPER_ACCOUNTS_BACKEND?.trim().toLowerCase();
  if (forced === "off" || forced === "0") return "off";
  if (forced === "supabase") {
    return hasSupabaseEnv() ? "supabase" : "local";
  }
  if (forced === "local") return "local";
  // Demo default: always on with name sign-in (no email required).
  return "local";
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isAccountsEnabled(): boolean {
  return accountsBackend() !== "off";
}

export function accountsEnabledPublic(): boolean {
  if (process.env.NEXT_PUBLIC_ACCOUNTS === "0") return false;
  return true;
}
