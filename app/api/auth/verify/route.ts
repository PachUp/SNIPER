import { NextRequest, NextResponse } from "next/server";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import { SESSION_COOKIE } from "@/lib/user/session";
import {
  localGetPortfolio,
  localPutPortfolio,
  localVerifyOtp,
} from "@/lib/user/localStore";
import { emptyCloudPayload } from "@/lib/user/types";

export const dynamic = "force-dynamic";

/** Verify local OTP and set session cookie. */
export async function POST(req: NextRequest) {
  if (!isAccountsEnabled() || accountsBackend() !== "local") {
    return NextResponse.json(
      { error: "OTP verify only for local accounts backend" },
      { status: 501 }
    );
  }

  let email = "";
  let code = "";
  let displayName = "";
  try {
    const body = (await req.json()) as {
      email?: string;
      code?: string;
      displayName?: string;
    };
    email = String(body.email || "").trim();
    code = String(body.code || "").trim();
    displayName = String(body.displayName || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await localVerifyOtp(email, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (displayName) {
    result.user.displayName = displayName;
    const existing =
      (await localGetPortfolio(result.user.id)) || emptyCloudPayload();
    existing.prefs = { ...existing.prefs, displayName };
    await localPutPortfolio(result.user, existing);
  }

  const res = NextResponse.json({ ok: true, user: result.user });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
