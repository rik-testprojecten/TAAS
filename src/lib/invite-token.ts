import { createHmac, timingSafeEqual } from "crypto";

// Stateless, expiring, HMAC-signed token for password-set / invite links.
// Signed with AUTH_SECRET so no extra DB table or schema migration is needed.

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Payload = { uid: string; email: string; exp: number };

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createInviteToken(uid: string, email: string, ttlMs = DEFAULT_TTL_MS): string {
  const payload: Payload = { uid, email, exp: Date.now() + ttlMs };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyInviteToken(token: string): { uid: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (!payload.uid || !payload.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return { uid: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}
