import { NextRequest, NextResponse } from "next/server";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import { createSupabaseServer } from "@/lib/user/supabase";

export const dynamic = "force-dynamic";

/**
 * Email sign-in (legacy). Demo uses POST /api/auth/name instead.
 * Supabase magic-link still works if SNIPER_ACCOUNTS_BACKEND=supabase.
 */
export async function POST(req: NextRequest) {
  if (!isAccountsEnabled()) {
    return NextResponse.json(
      { error: "Accounts not enabled" },
      { status: 501 }
    );
  }

  const backend = accountsBackend();
  if (backend === "local") {
    return NextResponse.json(
      {
        error: "Demo uses full-name sign-in. POST /api/auth/name with { displayName }.",
        use: "/api/auth/name",
      },
      { status: 410 }
    );
  }

  let email = "";
  let displayName = "";
  try {
    const body = (await req.json()) as {
      email?: string;
      displayName?: string;
    };
    email = String(body.email || "").trim();
    displayName = String(body.displayName || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  const origin = req.nextUrl.origin;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    mode: "magic_link",
    message: "Check your email for a sign-in link.",
  });
}
