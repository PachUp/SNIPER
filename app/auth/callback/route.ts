import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/user/supabase";

export const dynamic = "force-dynamic";

/** Supabase magic-link callback — exchange code for session cookies. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/dashboard";
  if (code) {
    const supabase = createSupabaseServer();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }
  return NextResponse.redirect(new URL(next, req.url));
}
