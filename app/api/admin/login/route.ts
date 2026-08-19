import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, issueToken, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function publicOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function isHttps(req: NextRequest): boolean {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:" ||
    host.includes("netlify.app") ||
    host.includes("sniper-proj")
  );
}

function attachSession(res: NextResponse, req: NextRequest) {
  res.cookies.set(ADMIN_COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

async function readPassword(req: NextRequest): Promise<string> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return String(body?.password ?? "").trim();
  }
  const form = await req.formData().catch(() => null);
  return String(form?.get("password") ?? "").trim();
}

/**
 * JSON clients get {ok:true}; HTML form posts (iOS Safari) get a 303 redirect
 * with Set-Cookie so the session sticks.
 */
export async function POST(req: NextRequest) {
  const type = req.headers.get("content-type") || "";
  const isForm =
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data");

  const password = await readPassword(req);
  const origin = publicOrigin(req);

  if (!verifyPassword(password)) {
    if (isForm) {
      return NextResponse.redirect(`${origin}/admin?error=1`, 303);
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (isForm) {
    const res = NextResponse.redirect(`${origin}/admin`, 303);
    attachSession(res, req);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  attachSession(res, req);
  return res;
}
