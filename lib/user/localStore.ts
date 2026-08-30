import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { AuthUser, CloudPortfolioPayload } from "@/lib/user/types";
import { emptyCloudPayload } from "@/lib/user/types";
import { isReadonlyDataStore } from "@/lib/data/store";
import {
  readAccountsBlob,
  writeAccountsBlob,
} from "@/lib/user/accountBlobs";

type SessionRow = {
  token: string;
  userId: string;
  /** Synthetic id email — demo uses name@demo.local */
  email: string;
  displayName: string;
  nameKey: string;
  expiresAt: number;
};

type PortfolioRow = {
  userId: string;
  email: string;
  displayName: string;
  nameKey: string;
  payload: CloudPortfolioPayload;
  updatedAt: string;
};

type StoreFile = {
  sessions: SessionRow[];
  portfolios: PortfolioRow[];
};

const SESSION_DAYS = 60;

/** In-memory fallback when Netlify FS is read-only (cold starts lose this). */
let memoryStore: StoreFile = { sessions: [], portfolios: [] };

function dataRoot(): string {
  const fromEnv = process.env.SNIPER_DATA_DIR?.trim();
  return fromEnv && fromEnv.length > 0
    ? path.resolve(fromEnv)
    : path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataRoot(), ".runtime", "user_accounts.json");
}

export function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function formatDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

function demoEmail(nameKey: string): string {
  const slug = nameKey.replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "user";
  return `${slug}@demo.local`;
}

function newId(): string {
  return createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 32);
}

function cloneStore(store: StoreFile): StoreFile {
  return {
    sessions: [...store.sessions],
    portfolios: [...store.portfolios],
  };
}

function pruneExpired(store: StoreFile, now = Date.now()): StoreFile {
  return {
    sessions: store.sessions.filter((s) => s.expiresAt > now),
    portfolios: store.portfolios,
  };
}

async function readStore(): Promise<StoreFile> {
  if (isReadonlyDataStore()) {
    const blob = await readAccountsBlob();
    if (blob) {
      memoryStore = pruneExpired({
        sessions: blob.sessions,
        portfolios: blob.portfolios,
      });
    }
    return cloneStore(memoryStore);
  }
  try {
    const raw = await fs.readFile(storePath(), "utf-8");
    const data = JSON.parse(raw) as Partial<StoreFile> & {
      otps?: unknown;
    };
    return pruneExpired({
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      portfolios: Array.isArray(data.portfolios) ? data.portfolios : [],
    });
  } catch {
    return { sessions: [], portfolios: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const next = pruneExpired(store);
  memoryStore = cloneStore(next);
  if (isReadonlyDataStore()) {
    const ok = await writeAccountsBlob(next);
    if (!ok) {
      console.error("[sniper] named port blob write failed");
    }
    return;
  }
  const dir = path.dirname(storePath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(next, null, 2) + "\n");
}

/** Demo sign-in: full name only — no email / OTP. */
export async function localSignInByName(
  nameRaw: string
): Promise<
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; error: string }
> {
  const displayName = formatDisplayName(nameRaw);
  const nameKey = normalizeNameKey(displayName);
  if (nameKey.length < 2) {
    return { ok: false, error: "Enter your full name" };
  }

  const store = await readStore();
  const now = Date.now();
  let portfolio = store.portfolios.find((p) => p.nameKey === nameKey);
  if (!portfolio) {
    portfolio = {
      userId: newId(),
      email: demoEmail(nameKey),
      displayName,
      nameKey,
      payload: emptyCloudPayload(),
      updatedAt: new Date().toISOString(),
    };
    store.portfolios.push(portfolio);
  } else {
    portfolio.displayName = displayName;
  }

  store.sessions = store.sessions.filter((s) => s.expiresAt > now);
  const token = randomBytes(24).toString("hex");
  store.sessions.push({
    token,
    userId: portfolio.userId,
    email: portfolio.email,
    displayName,
    nameKey,
    expiresAt: now + SESSION_DAYS * 24 * 60 * 60_000,
  });
  await writeStore(store);

  return {
    ok: true,
    token,
    user: {
      id: portfolio.userId,
      email: portfolio.email,
      displayName,
    },
  };
}

export async function localUserFromToken(
  token: string | undefined | null
): Promise<AuthUser | null> {
  if (!token) return null;
  const store = await readStore();
  const now = Date.now();
  const session = store.sessions.find(
    (s) => s.token === token && s.expiresAt > now
  );
  if (!session) return null;
  const portfolio = store.portfolios.find((p) => p.userId === session.userId);
  return {
    id: session.userId,
    email: session.email,
    displayName:
      session.displayName ||
      portfolio?.displayName ||
      portfolio?.payload?.prefs?.displayName ||
      "Friend",
  };
}

export async function localClearSession(token: string | undefined | null) {
  if (!token) return;
  const store = await readStore();
  store.sessions = store.sessions.filter((s) => s.token !== token);
  await writeStore(store);
}

export async function localGetPortfolio(
  userId: string
): Promise<CloudPortfolioPayload | null> {
  const store = await readStore();
  const row = store.portfolios.find((p) => p.userId === userId);
  return row?.payload ?? null;
}

export async function localPutPortfolio(
  user: AuthUser,
  payload: CloudPortfolioPayload
): Promise<CloudPortfolioPayload> {
  const store = await readStore();
  const updatedAt = payload.updatedAt || new Date().toISOString();
  const next: CloudPortfolioPayload = { ...payload, updatedAt };
  const displayName =
    payload.prefs?.displayName || user.displayName || "Friend";
  const nameKey = normalizeNameKey(displayName);
  const idx = store.portfolios.findIndex((p) => p.userId === user.id);
  if (idx >= 0) {
    store.portfolios[idx] = {
      ...store.portfolios[idx],
      email: user.email || store.portfolios[idx].email,
      displayName,
      nameKey,
      payload: next,
      updatedAt,
    };
  } else {
    store.portfolios.push({
      userId: user.id,
      email: user.email || demoEmail(nameKey),
      displayName,
      nameKey,
      payload: next,
      updatedAt,
    });
  }
  await writeStore(store);
  return next;
}

/** Wipe a demo name’s server port and sessions so hydrate cannot resurrect it. */
export async function localDeletePortfolioByName(
  nameRaw: string
): Promise<
  | { ok: true; deleted: boolean; nameKey: string }
  | { ok: false; error: string }
> {
  const displayName = formatDisplayName(nameRaw);
  const nameKey = normalizeNameKey(displayName);
  if (nameKey.length < 2) {
    return { ok: false, error: "Enter your full name" };
  }
  const store = await readStore();
  const before = store.portfolios.length;
  store.portfolios = store.portfolios.filter((p) => p.nameKey !== nameKey);
  store.sessions = store.sessions.filter((s) => s.nameKey !== nameKey);
  await writeStore(store);
  return {
    ok: true,
    deleted: store.portfolios.length < before,
    nameKey,
  };
}

/** List known demo names (for optional picker). */
export async function localListNames(): Promise<string[]> {
  const store = await readStore();
  return store.portfolios
    .map((p) => p.displayName)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
