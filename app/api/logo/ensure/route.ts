import { NextRequest, NextResponse } from "next/server";
import { ensureLogos } from "@/lib/logos/ensureLogo";

export const dynamic = "force-dynamic";

/** Desk / builders call this whenever tickers are added so logos are never missing. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body?.symbols)
    ? body.symbols
    : body?.symbol
      ? [body.symbol]
      : [];
  const symbols = raw
    .map((s: unknown) => String(s).toUpperCase().trim())
    .filter(Boolean);
  if (symbols.length === 0) {
    return NextResponse.json(
      { ok: false, error: "symbols required" },
      { status: 400 }
    );
  }
  await ensureLogos(symbols);
  return NextResponse.json({ ok: true, count: symbols.length });
}
