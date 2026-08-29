import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return { url, anon };
}

export function createSupabaseBrowser() {
  const { url, anon } = supabasePublicConfig();
  if (!url || !anon) return null;
  return createClient(url, anon);
}

export function createSupabaseServer() {
  const { url, anon } = supabasePublicConfig();
  if (!url || !anon) return null;

  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* Server Component — ignore */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* ignore */
        }
      },
    },
  });
}
