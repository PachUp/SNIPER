import { NextResponse } from "next/server";
import { provider } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const news = await provider.getNews();
  return NextResponse.json(news);
}
