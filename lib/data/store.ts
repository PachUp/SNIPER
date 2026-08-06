import { promises as fs } from "fs";
import path from "path";

/**
 * File-backed JSON store.
 *
 * Seed data lives in `data/*.json`. To keep admin edits separate from the
 * committed seeds, the first read of each collection copies the seed into
 * `data/.runtime/*.json`, and all subsequent reads/writes use the runtime copy.
 *
 * On serverless deploys (Netlify / Vercel / Lambda) the filesystem is
 * read-only, so we read seeds directly and no-op writes.
 *
 * When wiring in the real valuation software, this whole module can be ignored
 * in favor of a provider that calls the software's API/DB (see lib/data/index.ts).
 */

/** True when the deploy filesystem cannot persist `data/.runtime`. */
export function isReadonlyDataStore(): boolean {
  return (
    process.env.SNIPER_READONLY_DATA === "1" ||
    process.env.VERCEL === "1" ||
    process.env.NETLIFY === "true" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

function isFsReadonlyError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  return code === "ENOENT" || code === "EACCES" || code === "EROFS";
}

/** Shared with SNIPER-DESK via SNIPER_DATA_DIR (absolute path to the data folder). */
function dataRoot(): string {
  const fromEnv = process.env.SNIPER_DATA_DIR?.trim();
  return fromEnv && fromEnv.length > 0
    ? path.resolve(fromEnv)
    : path.join(process.cwd(), "data");
}

function seedDir(): string {
  return dataRoot();
}

function runtimeDir(): string {
  return path.join(dataRoot(), ".runtime");
}

async function ensureSeeded(name: string): Promise<string> {
  const seedPath = path.join(seedDir(), name);
  if (isReadonlyDataStore()) {
    return seedPath;
  }

  const runtimePath = path.join(runtimeDir(), name);
  try {
    await fs.access(runtimePath);
    return runtimePath;
  } catch {
    // fall through and try to seed
  }

  try {
    await fs.mkdir(runtimeDir(), { recursive: true });
    const seed = await fs.readFile(seedPath, "utf-8");
    await fs.writeFile(runtimePath, seed, "utf-8");
    return runtimePath;
  } catch (err) {
    // Read-only serverless FS (Netlify/Lambda) — use committed seed.
    if (isFsReadonlyError(err)) {
      return seedPath;
    }
    throw err;
  }
}

export async function readCollection<T>(name: string): Promise<T> {
  const p = await ensureSeeded(name);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeCollection<T>(name: string, data: T): Promise<T> {
  if (isReadonlyDataStore()) {
    // Soft-launch hosts cannot persist admin/catalog mutations.
    // Production truth is committed `data/*.json` (sync via deploy-live).
    return data;
  }
  try {
    await ensureSeeded(name);
    const payload = JSON.stringify(data, null, 2);
    const runtimePath = path.join(runtimeDir(), name);
    await fs.writeFile(runtimePath, payload, "utf-8");
    // Mirror into the committed seed so Netlify deploys ship desk edits
    // (SNIPER house book + stocks/ideas/news). Runtime alone is gitignored.
    const seedPath = path.join(seedDir(), name);
    await fs.writeFile(seedPath, payload, "utf-8");
  } catch (err) {
    if (isFsReadonlyError(err)) return data;
    throw err;
  }
  return data;
}

const AUDIT_FILE = "audit.json";

type AuditRecord = { time: string; action: string; details?: string };

export async function readAudit(): Promise<AuditRecord[]> {
  if (isReadonlyDataStore()) {
    return [];
  }
  const p = path.join(runtimeDir(), AUDIT_FILE);
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as AuditRecord[];
  } catch {
    return [];
  }
}

export async function appendAudit(entry: {
  action: string;
  details?: string;
}): Promise<void> {
  if (isReadonlyDataStore()) {
    return;
  }
  try {
    await fs.mkdir(runtimeDir(), { recursive: true });
    const existing = await readAudit();
    const record: AuditRecord = {
      time: new Date().toISOString(),
      action: entry.action,
      details: entry.details,
    };
    // Newest first; cap to a reasonable number of entries.
    const next = [record, ...existing].slice(0, 500);
    const p = path.join(runtimeDir(), AUDIT_FILE);
    await fs.writeFile(p, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    if (isFsReadonlyError(err)) return;
    throw err;
  }
}
