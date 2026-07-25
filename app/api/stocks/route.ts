import { NextResponse } from "next/server";
import { provider } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const stocks = await provider.getStocks();
  return NextResponse.json(stocks);
}
