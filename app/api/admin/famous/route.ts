import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import { warmLogos } from "@/lib/warmLogos";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const symbols = await provider.getFamousSymbols();
  return NextResponse.json({ symbols });
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body?.symbols) ? body.symbols : [];
  const symbols = raw.map((s: unknown) => String(s).toUpperCase().trim());
  if (symbols.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one ticker" },
      { status: 400 }
    );
  }
  const saved = await provider.saveFamousSymbols(symbols);
  warmLogos(saved);
  await appendAudit({
    action: "Update famous picks",
    details: saved.join(", "),
  });
  return NextResponse.json({ ok: true, symbols: saved });
}
