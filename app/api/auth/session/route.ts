import { NextResponse } from "next/server";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import {
  clearLocalSessionCookie,
  getAuthUser,
} from "@/lib/user/session";
import { createSupabaseServer } from "@/lib/user/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAccountsEnabled()) {
    return NextResponse.json({ enabled: false, user: null, backend: "off" });
  }
  const user = await getAuthUser();
  return NextResponse.json({
    enabled: true,
    backend: accountsBackend(),
    user,
  });
}

export async function DELETE() {
  if (!isAccountsEnabled()) {
    return NextResponse.json({ ok: true });
  }
  const backend = accountsBackend();
  if (backend === "local") {
    await clearLocalSessionCookie();
    return NextResponse.json({ ok: true });
  }
  const supabase = createSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
