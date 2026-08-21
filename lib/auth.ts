import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "sniper_admin";

/** Strip iOS/invisible junk that can sneak into password fields. */
function normalizePassword(input: string): string {
  return String(input ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

/**
 * Read at call time (bracket access) so Next/Netlify do not bake a missing
 * build-time value into the bundle. Live password = Netlify ADMIN_PASSWORD.
 */
function configuredPassword(): string {
  const raw = process.env["ADMIN_PASSWORD"];
  return normalizePassword(raw ?? "sniper");
}

function sessionToken(): string {
  return crypto
    .createHash("sha256")
    .update(`${configuredPassword()}::sniper-session`)
    .digest("hex");
}

export function verifyPassword(input: string): boolean {
  return normalizePassword(input) === configuredPassword();
}

export function issueToken(): string {
  return sessionToken();
}

/** True when Netlify / host set ADMIN_PASSWORD (not the built-in fallback). */
export function isAdminPasswordConfigured(): boolean {
  const raw = process.env["ADMIN_PASSWORD"];
  return typeof raw === "string" && raw.trim().length > 0;
}

/** Server-side check for use in route handlers and server components. */
export function isAuthed(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === sessionToken();
}
