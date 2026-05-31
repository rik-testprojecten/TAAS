import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTenantLoginCandidates } from "@/lib/login-queries";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email";
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
  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  try {
    const accounts: ResolvedAccount[] = [];

    // Platform-gebruiker (raakt geen reconcilieerbare kolommen). Case-insensitief
    // zodat invoer van mobiele toetsenborden (hoofdletter/spatie) blijft matchen.
    const platformUser = await prisma.platformUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    let platformPwOk = false;
    if (platformUser && platformUser.isActive) {
      platformPwOk = await bcrypt.compare(password, platformUser.password);
      if (platformPwOk) {
        accounts.push({ type: "platform", id: "platform", label: "Rhoost Platform" });
      }
    }

    // Klant-gebruikers — kan meerdere klanten betreffen met hetzelfde e-mailadres.
    const candidates = await getTenantLoginCandidates(email);
    let tenantPwMatches = 0;
    let tenantActiveRows = 0;
    for (const c of candidates) {
      if (c.isBlocked || !c.tenantActive) continue;
      tenantActiveRows++;
      if (await bcrypt.compare(password, c.password)) {
        tenantPwMatches++;
        accounts.push({
          type: "tenant",
          id: c.id,
          tenantId: c.tenantId,
          label: c.tenantName,
          mfaRequired: c.mfaRequired,
          mfaEnrolled: c.mfaEnabled && !!c.mfaSecret,
        });
      }
    }

    if (accounts.length === 0) {
      // Diagnostiek zonder gevoelige data: laat zien waar het op nul valt.
      logger.warn(
        {
          emailLen: email.length,
          platformFound: !!platformUser,
          platformActive: platformUser?.isActive ?? false,
          platformPwOk,
          tenantRows: candidates.length,
          tenantActiveRows,
          tenantPwMatches,
        },
        "Login resolve: geen accounts gevonden"
      );
      return NextResponse.json(
        { error: "Ongeldig e-mailadres of wachtwoord" },
        { status: 401 }
      );
    }

    return NextResponse.json({ accounts });
  } catch (err) {
    // Onderscheid serverfouten van een echte mismatch zodat dit niet als
    // "ongeldig wachtwoord" wordt gemaskeerd.
    logger.error(err, "Login resolve failed");
    return NextResponse.json(
      { error: "Inloggen is tijdelijk niet mogelijk door een serverfout. Probeer het zo opnieuw." },
      { status: 503 }
    );
  }
}
