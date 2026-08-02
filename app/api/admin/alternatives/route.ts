import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "");
  const alternatives: string[] = Array.isArray(body?.alternatives)
    ? body.alternatives
    : [];
  if (!ticker) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const updated = await provider.updateStockAlternatives(ticker, alternatives);
  await appendAudit({
    action: "Update alternatives",
    details: `${updated.ticker}: ${alternatives.join(", ") || "(none)"}`,
  });
  return NextResponse.json({ ok: true, stock: updated });
}
