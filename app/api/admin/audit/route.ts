import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { readAudit } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const entries = await readAudit();
  return NextResponse.json(entries);
}
