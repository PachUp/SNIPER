import { NextResponse } from "next/server";
import { provider } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const portfolio = await provider.getHousePortfolio();
  return NextResponse.json(portfolio);
}
