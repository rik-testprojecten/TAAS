import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export type MfaTenantUser = {
  id: string;
  tenantId: string;
  email: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  tenantName: string;
  mfaRequired: boolean;
};

/**
 * Valideert e-mail + wachtwoord voor een specifieke klant-account (accountId =
 * tenantUser.id). Geeft de gebruiker terug wanneer de credentials kloppen en
 * het account actief en niet-geblokkeerd is, anders null.
 */
export async function validateTenantCredentials(
  email: string,
  password: string,
  accountId: string
): Promise<MfaTenantUser | null> {
  // accountId (tenantUser.id) pint de exacte rij al; de e-mailcheck is een
  // extra waarborg en moet daarom case-insensitief zijn — anders mislukt de
  // 2FA-koppeling wanneer de opgeslagen schrijfwijze afwijkt van wat de
  // gebruiker typt (bijv. "Marisha@" vs "marisha@").
  const tu = await prisma.tenantUser.findFirst({
    where: {
      id: accountId,
      email: { equals: email, mode: "insensitive" },
      isActive: true,
      isBlocked: false,
    },
    include: { tenant: { select: { name: true, isActive: true, mfaRequired: true } } },
  });
  if (!tu || !tu.tenant.isActive) return null;
  if (!(await bcrypt.compare(password, tu.password))) return null;
  return {
    id: tu.id,
    tenantId: tu.tenantId,
    email: tu.email,
    mfaEnabled: tu.mfaEnabled,
    mfaSecret: tu.mfaSecret,
    tenantName: tu.tenant.name,
    mfaRequired: tu.tenant.mfaRequired,
  };
}
