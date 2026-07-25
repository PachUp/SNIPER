import { NextResponse } from "next/server";
import { BuilderError, listFamousPicks } from "@/lib/builder/run";
import { isMockBuilderEnabled } from "@/lib/builder/config";
import { provider } from "@/lib/data";
import { FAMOUS_MOCK } from "@/lib/builder/mockFamous";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (isMockBuilderEnabled()) {
      const stocks = await provider.getStocks();
      return NextResponse.json(FAMOUS_MOCK(stocks));
    }
    const data = await listFamousPicks();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BuilderError) {
      return NextResponse.json(
        { error: err.message, ...err.details },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
