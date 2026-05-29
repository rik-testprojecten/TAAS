import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type ResolvedAccount =
  | { type: "platform"; id: "platform"; label: string }
  | {
      type: "tenant";
      id: string; // tenantUser.id
      tenantId: string;
      label: string;
      mfaRequired: boolean;
      mfaEnrolled: boolean;
    };

/**
 * Valideert e-mail + wachtwoord en geeft terug bij welke accounts (platform
 * en/of klanten) deze combinatie geldig is. Eén e-mailadres kan bij meerdere
 * klanten horen; de gebruiker kiest daarna zelf de klant.
 */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const accounts: ResolvedAccount[] = [];

  // Platform-gebruiker
  const platformUser = await prisma.platformUser.findUnique({ where: { email } });
  if (platformUser && platformUser.isActive) {
    if (await bcrypt.compare(password, platformUser.password)) {
      accounts.push({ type: "platform", id: "platform", label: "Rhoost Platform" });
    }
  }

  // Klant-gebruikers — kan meerdere klanten betreffen met hetzelfde e-mailadres
  const tenantUsers = await prisma.tenantUser.findMany({
    where: { email, isActive: true, isBlocked: false },
    include: { tenant: { select: { id: true, name: true, isActive: true, mfaRequired: true } } },
  });
  for (const tu of tenantUsers) {
    if (!tu.tenant.isActive) continue;
    if (await bcrypt.compare(password, tu.password)) {
      accounts.push({
        type: "tenant",
        id: tu.id,
        tenantId: tu.tenant.id,
        label: tu.tenant.name,
        mfaRequired: tu.tenant.mfaRequired,
        mfaEnrolled: tu.mfaEnabled && !!tu.mfaSecret,
      });
    }
  }

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Ongeldig e-mailadres of wachtwoord" },
      { status: 401 }
    );
  }

  return NextResponse.json({ accounts });
}
