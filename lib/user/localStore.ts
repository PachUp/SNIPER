import { promises as fs } from "fs";
import path from "path";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { AuthUser, CloudPortfolioPayload } from "@/lib/user/types";
import { emptyCloudPayload } from "@/lib/user/types";
import { isReadonlyDataStore } from "@/lib/data/store";

type OtpRow = { email: string; hash: string; expiresAt: number };
type SessionRow = {
  token: string;
  userId: string;
  email: string;
  displayName?: string;
  expiresAt: number;
};
type PortfolioRow = {
  userId: string;
  email: string;
  displayName?: string;
  payload: CloudPortfolioPayload;
  updatedAt: string;
};

type StoreFile = {
  otps: OtpRow[];
  sessions: SessionRow[];
  portfolios: PortfolioRow[];
};

const SESSION_DAYS = 30;
const OTP_MINUTES = 15;

function dataRoot(): string {
  const fromEnv = process.env.SNIPER_DATA_DIR?.trim();
  return fromEnv && fromEnv.length > 0
    ? path.resolve(fromEnv)
    : path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataRoot(), ".runtime", "user_accounts.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath(), "utf-8");
    const data = JSON.parse(raw) as StoreFile;
    return {
      otps: Array.isArray(data.otps) ? data.otps : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      portfolios: Array.isArray(data.portfolios) ? data.portfolios : [],
    };
  } catch {
    return { otps: [], sessions: [], portfolios: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  if (isReadonlyDataStore()) {
    throw new Error("Local accounts store is read-only on this host");
  }
  const dir = path.dirname(storePath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2) + "\n");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function localRequestOtp(
  emailRaw: string
): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email" };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const store = await readStore();
  const now = Date.now();
  store.otps = store.otps.filter((o) => o.expiresAt > now && o.email !== email);
  store.otps.push({
    email,
    hash: hashCode(code),
    expiresAt: now + OTP_MINUTES * 60_000,
  });
  await writeStore(store);

  // Soft-launch / local: surface code in logs (and response in non-production).
  console.info(`[sniper-auth] OTP for ${email}: ${code}`);
  return {
    ok: true,
    devCode:
      process.env.NODE_ENV !== "production" ||
      process.env.SNIPER_ACCOUNTS_DEV === "1"
        ? code
        : undefined,
  };
}

export async function localVerifyOtp(
  emailRaw: string,
  code: string
): Promise<
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(emailRaw);
  const store = await readStore();
  const now = Date.now();
  const otp = store.otps.find((o) => o.email === email && o.expiresAt > now);
  if (!otp) return { ok: false, error: "Code expired — request a new one" };

  const a = Buffer.from(otp.hash);
  const b = Buffer.from(hashCode(code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Wrong code" };
  }

  store.otps = store.otps.filter((o) => o.email !== email);
  let portfolio = store.portfolios.find((p) => p.email === email);
  if (!portfolio) {
    portfolio = {
      userId: newId(),
      email,
      payload: emptyCloudPayload(),
      updatedAt: new Date().toISOString(),
    };
    store.portfolios.push(portfolio);
  }

  const token = randomBytes(24).toString("hex");
  store.sessions = store.sessions.filter(
    (s) => s.expiresAt > now && s.email !== email
  );
  store.sessions.push({
    token,
    userId: portfolio.userId,
    email,
    displayName: portfolio.displayName,
    expiresAt: now + SESSION_DAYS * 24 * 60 * 60_000,
  });
  await writeStore(store);

  return {
    ok: true,
    token,
    user: {
      id: portfolio.userId,
      email,
      displayName: portfolio.displayName,
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
      portfolio?.payload?.prefs?.displayName,
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
  const idx = store.portfolios.findIndex((p) => p.userId === user.id);
  if (idx >= 0) {
    store.portfolios[idx] = {
      ...store.portfolios[idx],
      email: user.email,
      displayName: payload.prefs?.displayName || user.displayName,
      payload: next,
      updatedAt,
    };
  } else {
    store.portfolios.push({
      userId: user.id,
      email: user.email,
      displayName: payload.prefs?.displayName || user.displayName,
      payload: next,
      updatedAt,
    });
  }
  await writeStore(store);
  return next;
}
