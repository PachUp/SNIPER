/**
 * Phase 2 accounts config.
 * - supabase: production (magic link)
 * - local: file + OTP in data/.runtime (dev / soft-launch without Supabase)
 * - off: guest-only
 */
export type AccountsBackend = "supabase" | "local" | "off";

export function accountsBackend(): AccountsBackend {
  const forced = process.env.SNIPER_ACCOUNTS_BACKEND?.trim().toLowerCase();
  if (forced === "off" || forced === "0") return "off";
  if (forced === "local") return "local";
  if (forced === "supabase") {
    return hasSupabaseEnv() ? "supabase" : "off";
  }
  if (hasSupabaseEnv()) return "supabase";
  // Local/dev default: file OTP store so Phase 2 can be exercised without Supabase.
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.SNIPER_ACCOUNTS_DEV === "1"
  ) {
    return "local";
  }
  return "off";
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

/** Public flag for client components (build-time inlined). */
export function accountsEnabledPublic(): boolean {
  if (process.env.NEXT_PUBLIC_ACCOUNTS === "0") return false;
  if (process.env.NEXT_PUBLIC_ACCOUNTS === "1") return true;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}
