import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const blurbs = await provider.getBlurbs();
  return NextResponse.json({ blurbs });
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "")
    .toUpperCase()
    .trim();
  if (!ticker) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const saved = await provider.saveBlurb(ticker, {
    headline: String(body?.headline ?? body?.business ?? ""),
    entry: String(body?.entry ?? ""),
  });
  await appendAudit({
    action: "Update blurb",
    details: ticker,
  });
  return NextResponse.json({ ok: true, blurb: saved });
}
