import { NextRequest, NextResponse } from "next/server";
import { accountsBackend, isAccountsEnabled } from "@/lib/user/config";
import {
  getAuthUser,
  getCloudPortfolio,
  putCloudPortfolio,
} from "@/lib/user/session";
import type { CloudPortfolioPayload } from "@/lib/user/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAccountsEnabled()) {
    return NextResponse.json(
      { error: "Accounts not enabled", enabled: false },
      { status: 501 }
    );
  }
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const payload = await getCloudPortfolio(user);
  return NextResponse.json({
    user,
    payload,
    backend: accountsBackend(),
  });
}

export async function PUT(req: NextRequest) {
  if (!isAccountsEnabled()) {
    return NextResponse.json(
      { error: "Accounts not enabled", enabled: false },
      { status: 501 }
    );
  }
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: { payload?: CloudPortfolioPayload };
  try {
    body = (await req.json()) as { payload?: CloudPortfolioPayload };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "payload required" }, { status: 400 });
  }
  try {
    const saved = await putCloudPortfolio(user, body.payload);
    return NextResponse.json({ user, payload: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
