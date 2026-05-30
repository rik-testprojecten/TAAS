import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTenantLoginCandidates } from "@/lib/login-queries";
import { logger } from "@/lib/logger";
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
  const email = parsed.data.email.trim();
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
    const activeCandidates = candidates.filter((c) => !c.isBlocked && c.tenantActive);
    tenantActiveRows = activeCandidates.length;

    // Controleer of het wachtwoord bij minstens één klant-account klopt.
    // Als dat zo is, tonen we ALLE actieve accounts voor dit e-mailadres zodat
    // een gebruiker die bij meerdere klanten hoort (eventueel met verschillende
    // wachtwoorden) altijd de keuze krijgt. Het wachtwoord per gekozen account
    // wordt daarna opnieuw geverifieerd in auth.ts bij het definitieve signIn.
    for (const c of activeCandidates) {
      if (await bcrypt.compare(password, c.password)) {
        tenantPwMatches++;
      }
    }
    if (tenantPwMatches > 0) {
      for (const c of activeCandidates) {
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
