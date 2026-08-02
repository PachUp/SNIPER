import { cookies } from "next/headers";
import crypto from "crypto";

const PASSWORD = process.env.ADMIN_PASSWORD || "sniper";
export const ADMIN_COOKIE = "sniper_admin";

function sessionToken(): string {
  return crypto
    .createHash("sha256")
    .update(`${PASSWORD}::sniper-session`)
    .digest("hex");
}

export function verifyPassword(input: string): boolean {
  return input === PASSWORD;
}

export function issueToken(): string {
  return sessionToken();
}

/** Server-side check for use in route handlers and server components. */
export function isAuthed(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === sessionToken();
}
