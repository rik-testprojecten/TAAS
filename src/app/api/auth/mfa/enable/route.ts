import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateTenantCredentials } from "@/lib/auth-mfa";
import { verifyToken } from "@/lib/totp";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  accountId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Rondt de 2FA-koppelstap af: verifieert de ingevoerde code tegen het eerder
 * gegenereerde geheim en activeert 2FA voor het account.
 */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { email, password, accountId, code } = parsed.data;

  const user = await validateTenantCredentials(email, password, accountId);
  if (!user) {
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }
  if (!user.mfaSecret) {
    return NextResponse.json({ error: "Start eerst de koppelstap" }, { status: 400 });
  }
  if (!verifyToken(user.mfaSecret, code)) {
    return NextResponse.json({ error: "Ongeldige code. Probeer het opnieuw." }, { status: 400 });
  }

  await prisma.tenantUser.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  return NextResponse.json({ ok: true });
}
