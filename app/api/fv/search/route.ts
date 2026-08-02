import { NextRequest, NextResponse } from "next/server";
import { searchFvUniverse } from "@/lib/builder/fvSearch";

export const dynamic = "force-dynamic";

/** Search FvIndustries universe by ticker / name / industry. */
export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") || "");
  const excludeRaw = String(req.nextUrl.searchParams.get("exclude") || "");
  const exclude = new Set(
    excludeRaw
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
  );
  try {
    const hits = await searchFvUniverse(q, { limit: 12, exclude });
    return NextResponse.json({ query: q, count: hits.length, hits });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "FvIndustries search failed";
    return NextResponse.json({ error: message, hits: [] }, { status: 500 });
  }
}
