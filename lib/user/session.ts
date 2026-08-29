import { cookies } from "next/headers";
import { accountsBackend } from "@/lib/user/config";
import { createSupabaseServer } from "@/lib/user/supabase";
import {
  localClearSession,
  localGetPortfolio,
  localPutPortfolio,
  localUserFromToken,
} from "@/lib/user/localStore";
import type { AuthUser, CloudPortfolioPayload } from "@/lib/user/types";
import { emptyCloudPayload } from "@/lib/user/types";

export const SESSION_COOKIE = "sniper_user_session";

export async function getAuthUser(): Promise<AuthUser | null> {
  const backend = accountsBackend();
  if (backend === "off") return null;

  if (backend === "local") {
    const token = cookies().get(SESSION_COOKIE)?.value;
    return localUserFromToken(token);
  }

  const supabase = createSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u?.email) return null;
  return {
    id: u.id,
    email: u.email,
    displayName:
      typeof u.user_metadata?.display_name === "string"
        ? u.user_metadata.display_name
        : undefined,
  };
}

export async function getCloudPortfolio(
  user: AuthUser
): Promise<CloudPortfolioPayload> {
  const backend = accountsBackend();
  if (backend === "local") {
    return (await localGetPortfolio(user.id)) ?? emptyCloudPayload();
  }

  const supabase = createSupabaseServer();
  if (!supabase) return emptyCloudPayload();
  const { data, error } = await supabase
    .from("sniper_portfolios")
    .select("payload")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[sniper-auth] get portfolio", error.message);
    return emptyCloudPayload();
  }
  if (!data?.payload || typeof data.payload !== "object") {
    return emptyCloudPayload();
  }
  return data.payload as CloudPortfolioPayload;
}

export async function putCloudPortfolio(
  user: AuthUser,
  payload: CloudPortfolioPayload
): Promise<CloudPortfolioPayload> {
  const updatedAt = new Date().toISOString();
  const next: CloudPortfolioPayload = { ...payload, updatedAt };
  const backend = accountsBackend();

  if (backend === "local") {
    return localPutPortfolio(user, next);
  }

  const supabase = createSupabaseServer();
  if (!supabase) throw new Error("Accounts backend unavailable");

  const { error } = await supabase.from("sniper_portfolios").upsert(
    {
      user_id: user.id,
      email: user.email,
      display_name: next.prefs?.displayName || user.displayName || null,
      payload: next,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
  return next;
}

export async function clearLocalSessionCookie() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await localClearSession(token);
  try {
    cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  } catch {
    /* ignore */
  }
}
