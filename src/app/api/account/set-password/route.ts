import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invite-token";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// Public endpoint authenticated by a signed invite token (no session yet).
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: "set-password", windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const payload = verifyInviteToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 401 });
  }

  const user = await prisma.tenantUser.findUnique({ where: { id: payload.uid } });
  // Bind the token to the email at issue time so a changed email invalidates it.
  if (!user || user.email !== payload.email || !user.isActive) {
    return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 401 });
  }

  await prisma.tenantUser.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  return NextResponse.json({ success: true });
}
