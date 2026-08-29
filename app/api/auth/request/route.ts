import { NextRequest, NextResponse } from "next/server";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import { createSupabaseServer } from "@/lib/user/supabase";
import { localRequestOtp } from "@/lib/user/localStore";

export const dynamic = "force-dynamic";

/** Start email sign-in: Supabase magic link or local OTP. */
export async function POST(req: NextRequest) {
  if (!isAccountsEnabled()) {
    return NextResponse.json(
      { error: "Accounts not enabled" },
      { status: 501 }
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

  const backend = accountsBackend();
  if (backend === "local") {
    const result = await localRequestOtp(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      mode: "otp",
      message: "Check your email for a 6-digit code (local/dev may show it below).",
      devCode: result.devCode,
      displayName: displayName || undefined,
    });
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
