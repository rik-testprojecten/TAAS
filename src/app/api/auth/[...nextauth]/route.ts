import { handlers } from "../../../../../auth";
import { checkRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const { GET } = handlers;

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const params = await ctx.params;
  // Only rate-limit credential sign-in, not session/csrf/signout
  if (params.nextauth?.[0] === "signin") {
    const limited = checkRateLimit(req);
    if (limited) return limited;
  }
  return handlers.POST(req, ctx);
}
