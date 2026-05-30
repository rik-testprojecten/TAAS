import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type Entry = { count: number; resetAt: number };

// In-memory store — safe for single-instance dev; on Vercel each lambda is isolated
// so this still limits bursts within one instance. For multi-instance protection use Upstash Redis.
const store = new Map<string, Entry>();

export type RateLimitOptions = {
  /** Logical bucket name so different endpoints don't share counters. */
  bucket: string;
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Max requests allowed per IP per window. */
  max?: number;
};

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Generic fixed-window rate limiter. Returns a 429 NextResponse when the limit
 * is exceeded, or null when the request may proceed.
 */
export function rateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 10;
  const key = `${opts.bucket}:${getIp(req)}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > max) {
    logger.warn({ ip: getIp(req), bucket: opts.bucket, count: entry.count }, "Rate limit exceeded");
    return NextResponse.json(
      { error: "Te veel aanvragen. Probeer het later opnieuw." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}

/** Backwards-compatible helper used by the auth/login endpoint. */
export function checkRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, { bucket: "auth-login", windowMs: 60_000, max: 10 });
}
