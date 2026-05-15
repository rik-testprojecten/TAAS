import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type Entry = { count: number; resetAt: number };

// In-memory store — safe for single-instance dev; on Vercel each lambda is isolated
// so this still limits bursts within one instance. For multi-instance protection use Upstash Redis.
const store = new Map<string, Entry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;  // max 10 login attempts per IP per minute

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = getIp(req);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    logger.warn({ ip, count: entry.count }, "Rate limit exceeded on auth endpoint");
    return NextResponse.json(
      { error: "Te veel inlogpogingen. Probeer het over een minuut opnieuw." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
