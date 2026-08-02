import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/quotes/fmp";

export const dynamic = "force-dynamic";

/** Live quotes from FMP. Query: ?symbols=AAPL,MSFT */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 80);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {}, error: "symbols required" }, { status: 400 });
  }

  if (!(process.env.FMP_API_KEY || "").trim()) {
    return NextResponse.json(
      { quotes: {}, error: "FMP_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const quotes = await fetchQuotes(symbols);
    return NextResponse.json({
      quotes,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        quotes: {},
        error: err instanceof Error ? err.message : "Quote fetch failed",
      },
      { status: 502 }
    );
  }
}
