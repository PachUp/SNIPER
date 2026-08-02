import { NextRequest, NextResponse } from "next/server";
import {
  fetchHistoricalCloses,
  type PerfRange,
} from "@/lib/quotes/fmp";

export const dynamic = "force-dynamic";

const RANGES = new Set<PerfRange>(["1W", "1M", "ALL"]);

/** Historical daily closes. Query: ?symbols=AAPL,MSFT&range=1M */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const rangeRaw = (req.nextUrl.searchParams.get("range") || "1M").toUpperCase();
  const range = (RANGES.has(rangeRaw as PerfRange) ? rangeRaw : "1M") as PerfRange;
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 24);

  if (symbols.length === 0) {
    return NextResponse.json(
      { history: {}, error: "symbols required" },
      { status: 400 }
    );
  }
  if (!(process.env.FMP_API_KEY || "").trim()) {
    return NextResponse.json(
      { history: {}, error: "FMP_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const history = await fetchHistoricalCloses(symbols, range);
    return NextResponse.json({ history, range, asOf: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      {
        history: {},
        error: err instanceof Error ? err.message : "History fetch failed",
      },
      { status: 502 }
    );
  }
}
