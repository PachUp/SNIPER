import { NextRequest, NextResponse } from "next/server";
import { provider } from "@/lib/data";
import { isAuthed } from "@/lib/auth";
import { appendAudit } from "@/lib/data/store";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const news: NewsItem[] = Array.isArray(body?.news) ? body.news : [];
  const saved = await provider.saveNews(news);
  await appendAudit({
    action: "Save news",
    details: `${saved.length} news item(s) published`,
  });
  return NextResponse.json({ ok: true, news: saved });
}
