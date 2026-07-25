import { promises as fs } from "fs";
import path from "path";

/**
 * File-backed JSON store.
 *
 * Seed data lives in `data/*.json`. To keep admin edits separate from the
 * committed seeds, the first read of each collection copies the seed into
 * `data/.runtime/*.json`, and all subsequent reads/writes use the runtime copy.
 *
 * When wiring in the real valuation software, this whole module can be ignored
 * in favor of a provider that calls the software's API/DB (see lib/data/index.ts).
 */

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
  const runtimePath = path.join(runtimeDir(), name);
  try {
    await fs.access(runtimePath);
  } catch {
    await fs.mkdir(runtimeDir(), { recursive: true });
    const seed = await fs.readFile(path.join(seedDir(), name), "utf-8");
    await fs.writeFile(runtimePath, seed, "utf-8");
  }
  return runtimePath;
}

export async function readCollection<T>(name: string): Promise<T> {
  const p = await ensureSeeded(name);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeCollection<T>(name: string, data: T): Promise<T> {
  await ensureSeeded(name);
  const p = path.join(runtimeDir(), name);
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

const AUDIT_FILE = "audit.json";

type AuditRecord = { time: string; action: string; details?: string };

export async function readAudit(): Promise<AuditRecord[]> {
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
}
