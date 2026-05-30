// Standaard template-workflows per subonderdeel — CLI-seed.
//
// Maakt voor elk subonderdeel een platform-template aan met versie v1.0,
// stappen en een koppeling aan het subonderdeel. Idempotent (upserts op
// stabiele id's). Bestaande publicatiestatus blijft behouden.
//
// Draaien:  npx tsx prisma/seed-templates.ts   (of: npm run db:seed-templates)
// Vereist een bereikbare DATABASE_URL.

import { PrismaClient } from "@prisma/client";
import { seedStandardTemplates } from "../src/lib/templates";

const prisma = new PrismaClient();

async function main() {
  const { templates, steps } = await seedStandardTemplates(prisma);
  console.log(`Template-seed klaar: ${templates} templates, ${steps} stappen.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
