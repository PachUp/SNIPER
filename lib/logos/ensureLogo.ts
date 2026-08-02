import { promises as fs } from "fs";
import path from "path";
import { tickerDomain } from "@/lib/tickerLogo";
import { isReadonlyDataStore } from "@/lib/data/store";

const DATA_DIR =
  process.env.SNIPER_DATA_DIR?.trim() ||
  path.join(process.cwd(), "data");

export function logosPublicDir(): string {
  return path.join(process.cwd(), "public", "logos");
}

export function logosCacheDir(): string {
  return path.join(path.resolve(DATA_DIR), ".runtime", "logos");
}

function candidates(symbol: string): string[] {
  const sym = symbol.toUpperCase();
  const domain = tickerDomain(sym);
  const urls = [
    `https://storage.googleapis.com/iex/api/logos/${sym}.png`,
    `https://financialmodelingprep.com/image-stock/${sym}.png`,
    `https://images.financialmodelingprep.com/symbol/${sym}.png`,
  ];
  if (domain) {
    urls.push(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`
    );
  }
  return urls;
}

function isImage(buf: Buffer, contentType: string | null): boolean {
  if (buf.length < 64) return false;
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("html") || ct.includes("json") || ct.includes("text/plain")) {
    return false;
  }
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49) return true;
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01) return true;
  if (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return true;
  }
  return ct.startsWith("image/") && buf.length > 200;
}

/** Fetch a logo from remote CDNs (no disk writes). */
export async function fetchRemoteLogo(symbol: string): Promise<Buffer | null> {
  const sym = normalizeTicker(symbol);
  if (!sym) return null;
  for (const url of candidates(sym)) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SNIPER/1.0; +logo ensure)",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isImage(buf, res.headers.get("content-type"))) continue;
      return buf;
    } catch {
      // next source
    }
  }
  return null;
}

export function normalizeTicker(symbol: string): string {
  return String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .trim();
}

/** True if a usable static logo file already exists. */
export async function hasLogo(symbol: string): Promise<boolean> {
  const sym = normalizeTicker(symbol);
  if (!sym) return false;
  try {
    const st = await fs.stat(path.join(logosPublicDir(), `${sym}.png`));
    return st.size > 400;
  } catch {
    return false;
  }
}

/**
 * Guarantee a logo file at public/logos/{SYMBOL}.png.
 * Safe to call fire-and-forget when any stock is added.
 */
export async function ensureLogo(symbol: string): Promise<boolean> {
  const sym = normalizeTicker(symbol);
  if (!sym || sym.length > 12) return false;

  // Packaged logos only on serverless — cannot write public/ or .runtime/.
  if (isReadonlyDataStore()) {
    return hasLogo(sym);
  }

  const publicDir = logosPublicDir();
  const cacheDir = logosCacheDir();
  await fs.mkdir(publicDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });
  const publicPath = path.join(publicDir, `${sym}.png`);

  if (await hasLogo(sym)) return true;

  // Promote from runtime cache if present
  try {
    const cached = await fs.readFile(path.join(cacheDir, `${sym}.png`));
    if (cached.length > 400) {
      await fs.writeFile(publicPath, cached);
      return true;
    }
  } catch {
    // miss
  }
  try {
    const cachedBin = await fs.readFile(path.join(cacheDir, `${sym}.bin`));
    if (cachedBin.length > 400) {
      await fs.writeFile(publicPath, cachedBin);
      return true;
    }
  } catch {
    // miss
  }

  const buf = await fetchRemoteLogo(sym);
  if (!buf) return false;

  await fs.writeFile(publicPath, buf);
  try {
    await fs.writeFile(path.join(cacheDir, `${sym}.png`), buf);
  } catch {
    // optional
  }
  return true;
}

/** Ensure many tickers (deduped). Never throws. */
export async function ensureLogos(symbols: string[]): Promise<void> {
  const uniq = [...new Set(symbols.map(normalizeTicker).filter(Boolean))];
  await Promise.all(
    uniq.map(async (sym) => {
      try {
        await ensureLogo(sym);
      } catch {
        // never block callers
      }
    })
  );
}

/** Fire-and-forget wrapper for route handlers. */
export function ensureLogoAsync(symbol: string): void {
  void ensureLogo(symbol).catch(() => undefined);
}

export function ensureLogosAsync(symbols: string[]): void {
  void ensureLogos(symbols).catch(() => undefined);
}
