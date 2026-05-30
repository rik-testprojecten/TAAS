import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateTenantCredentials } from "@/lib/auth-mfa";
import { generateSecret, buildOtpauthUrl, buildQrDataUrl } from "@/lib/totp";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  accountId: z.string().min(1),
});

/**
 * Start de 2FA-koppelstap: genereert een nieuw geheim, slaat dit (nog niet
 * geactiveerd) op en geeft een QR-code + geheim terug om te scannen in een
 * authenticator-app. Activatie gebeurt pas na het bevestigen van een code
 * via /api/auth/mfa/enable.
 */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { email, password, accountId } = parsed.data;

  const user = await validateTenantCredentials(email, password, accountId);
  if (!user) {
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }
  if (!user.mfaRequired) {
    return NextResponse.json({ error: "Voor deze klant is 2FA niet vereist" }, { status: 400 });
  }
  if (user.mfaEnabled) {
    return NextResponse.json({ error: "2FA is al gekoppeld" }, { status: 409 });
  }

  const secret = generateSecret();
  await prisma.tenantUser.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });

  const otpauthUrl = buildOtpauthUrl(secret, `${user.tenantName} (${user.email})`);
  const qrDataUrl = await buildQrDataUrl(otpauthUrl);

  return NextResponse.json({ secret, otpauthUrl, qrDataUrl });
}
