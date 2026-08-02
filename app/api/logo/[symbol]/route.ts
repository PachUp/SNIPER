import { promises as fs } from "fs";
import path from "path";
import {
  ensureLogo,
  fetchRemoteLogo,
  logosCacheDir,
  logosPublicDir,
  normalizeTicker,
} from "@/lib/logos/ensureLogo";

export const dynamic = "force-dynamic";

function logoResponse(buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control":
        "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = normalizeTicker(params.symbol || "");
  if (!symbol || symbol.length > 12) {
    return new Response("Bad symbol", { status: 400 });
  }

  // Always try to materialize into public/logos first (no-op on serverless).
  await ensureLogo(symbol);

  const publicPath = path.join(logosPublicDir(), `${symbol}.png`);
  const cachePath = path.join(logosCacheDir(), `${symbol}.png`);

  for (const file of [publicPath, cachePath]) {
    try {
      const buf = await fs.readFile(file);
      if (buf.length > 64) {
        return logoResponse(buf);
      }
    } catch {
      // try next
    }
  }

  // Soft-launch hosts cannot cache to disk — stream a remote logo instead.
  const remote = await fetchRemoteLogo(symbol);
  if (remote && remote.length > 64) {
    return logoResponse(remote);
  }

  return new Response("Logo not found", { status: 404 });
}
