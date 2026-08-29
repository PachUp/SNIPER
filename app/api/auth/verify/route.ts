import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Local email OTP removed — demo uses POST /api/auth/name. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Demo uses full-name sign-in. POST /api/auth/name with { displayName }.",
      use: "/api/auth/name",
    },
    { status: 410 }
  );
}
