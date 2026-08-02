import { NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { loadCompanyBlurbs } from "@/lib/builder/blurbs";
import { applyBlurbsToStocks } from "@/lib/builder/map";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stocks, blurbs] = await Promise.all([
    provider.getStocks(),
    loadCompanyBlurbs(),
  ]);
  return NextResponse.json(applyBlurbsToStocks(stocks, blurbs));
}
