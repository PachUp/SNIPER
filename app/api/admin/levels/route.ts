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
  const levels = body?.levels;
  if (
    !ticker ||
    typeof levels?.ep !== "number" ||
    typeof levels?.tp !== "number" ||
    typeof levels?.sl !== "number"
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const updated = await provider.updateStockLevels(ticker, levels);
  await appendAudit({
    action: "Update levels",
    details: `${updated.ticker}: Buy ${levels.ep} / Sell ${levels.tp} / Exit ${levels.sl}`,
  });
  return NextResponse.json({ ok: true, stock: updated });
}
