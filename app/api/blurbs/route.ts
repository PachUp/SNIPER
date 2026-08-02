import { NextResponse } from "next/server";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";

export const dynamic = "force-dynamic";

/** StockAnalysis headline + entry map for client overlay on holdings. */
export async function GET() {
  const blurbs = await loadCompanyBlurbs();
  const obj: Record<string, { headline: string; entry: string; numbers?: string }> = {};
  for (const [ticker, blurb] of blurbs) {
    obj[ticker] = blurb;
  }
  return NextResponse.json(obj);
}
