// One-time e-mailnormalisatie.
//
// Bestaande databases kunnen e-mailadressen in gemengde schrijfwijze bevatten
// (bijv. "Marisha@rhoost.nl" in twee omgevingen en "marisha@rhoost.nl" in een
// derde). De loginflow matcht al case-insensitief, maar voor een consistente
// dataset zetten we alle opgeslagen adressen naar kleine letters. Hetzelfde
// adres in verschillende omgevingen wordt zo herkenbaar als dezelfde persoon.
//
// Het script is idempotent en botsing-veilig:
//   - PlatformUser.email is globaal uniek; bij een botsing (twee adressen die
//     alleen in hoofdletters verschillen) wordt de rij overgeslagen en gemeld.
//   - TenantUser is uniek per (tenantId, email); een botsing binnen dezelfde
//     omgeving wordt overgeslagen en gemeld (handmatige samenvoeging nodig).
//
// Gebruik:  DATABASE_URL=... node scripts/normalize-emails.mjs
// Vereist DATABASE_URL (zoals de Prisma-client).

import { PrismaClient } from "@prisma/client";

const normalize = (e) => e.trim().toLowerCase();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is niet gezet — afgebroken.");
  process.exit(1);
}

const prisma = new PrismaClient();

let updated = 0;
const skipped = [];

try {
  // ─── PlatformUser (globaal uniek e-mailadres) ──────────────────────────────
  const platformUsers = await prisma.platformUser.findMany({
    select: { id: true, email: true },
  });
  for (const u of platformUsers) {
    const lower = normalize(u.email);
    if (lower === u.email) continue;
    const clash = await prisma.platformUser.findFirst({
      where: { email: { equals: lower, mode: "insensitive" }, NOT: { id: u.id } },
      select: { id: true },
    });
    if (clash) {
      skipped.push(`PlatformUser ${u.id} (${u.email}) botst met ${clash.id}`);
      continue;
    }
    await prisma.platformUser.update({ where: { id: u.id }, data: { email: lower } });
    updated++;
  }

  // ─── TenantUser (uniek per tenantId + email) ───────────────────────────────
  const tenantUsers = await prisma.tenantUser.findMany({
    select: { id: true, email: true, tenantId: true },
  });
  for (const u of tenantUsers) {
    const lower = normalize(u.email);
    if (lower === u.email) continue;
    const clash = await prisma.tenantUser.findFirst({
      where: {
        tenantId: u.tenantId,
        email: { equals: lower, mode: "insensitive" },
        NOT: { id: u.id },
      },
      select: { id: true },
    });
    if (clash) {
      skipped.push(
        `TenantUser ${u.id} (${u.email}) botst binnen omgeving ${u.tenantId} met ${clash.id}`
      );
      continue;
    }
    await prisma.tenantUser.update({ where: { id: u.id }, data: { email: lower } });
    updated++;
  }

  console.log(`Klaar. ${updated} e-mailadres(sen) genormaliseerd.`);
  if (skipped.length > 0) {
    console.warn(`\n${skipped.length} overgeslagen wegens botsing (handmatig samenvoegen):`);
    for (const s of skipped) console.warn(`  - ${s}`);
  }
} catch (err) {
  console.error("Normalisatie mislukt:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
