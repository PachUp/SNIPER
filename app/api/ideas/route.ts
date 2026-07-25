import { NextResponse } from "next/server";
import { provider } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const ideas = await provider.getIdeas();
  return NextResponse.json(ideas);
}
