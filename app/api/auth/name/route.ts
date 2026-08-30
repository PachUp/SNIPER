import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import { SESSION_COOKIE, getAuthUser } from "@/lib/user/session";
import {
  localClearSession,
  localDeletePortfolioByName,
  localSignInByName,
  normalizeNameKey,
} from "@/lib/user/localStore";

export const dynamic = "force-dynamic";

/** Demo sign-in: full name only. */
export async function POST(req: NextRequest) {
  if (!isAccountsEnabled() || accountsBackend() !== "local") {
    return NextResponse.json(
      { error: "Name sign-in requires local accounts backend" },
      { status: 501 }
    );
  }

  let displayName = "";
  try {
    const body = (await req.json()) as { displayName?: string; name?: string };
    displayName = String(body.displayName || body.name || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await localSignInByName(displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const res = NextResponse.json({
    ok: true,
    mode: "name",
    user: result.user,
  });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** Wipe a name’s server port. Same trust model as name sign-in (no password). */
export async function DELETE(req: NextRequest) {
  if (!isAccountsEnabled() || accountsBackend() !== "local") {
    return NextResponse.json(
      { error: "Name delete requires local accounts backend" },
      { status: 501 }
    );
  }

  let displayName = "";
  try {
    const body = (await req.json()) as { displayName?: string; name?: string };
    displayName = String(body.displayName || body.name || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await localDeletePortfolioByName(displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await getAuthUser();
  const signedOut = Boolean(
    user?.displayName &&
      normalizeNameKey(user.displayName) === result.nameKey
  );
  const res = NextResponse.json({
    ok: true,
    deleted: result.deleted,
    signedOut,
  });
  if (signedOut) {
    const token = cookies().get(SESSION_COOKIE)?.value;
    await localClearSession(token);
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
