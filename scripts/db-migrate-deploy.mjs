// Safe migrate-on-deploy entrypoint.
//
// This project used to manage its schema with `prisma db push`, so the existing
// database contains all tables but has NO migration history (`_prisma_migrations`
// table). `prisma migrate deploy` refuses such a database with error P3005.
//
// This script makes the deploy fully automatic — no manual database commands:
//   - Existing db-push database (tables present, no history):
//       register the `0_init` baseline as already applied, then deploy.
//   - Brand-new / empty database (no history, no tables):
//       just deploy (migrations create everything from scratch).
//   - Database already on Prisma Migrate (history present):
//       just deploy (applies any new migrations, otherwise a no-op).
//
// Requires DATABASE_URL (the same variable `migrate deploy` needs).

import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const BASELINE = '0_init';

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// No database connection at build time (e.g. a Vercel Preview build where
// DATABASE_URL is scoped to Production only). Skip migrations rather than failing
// the build — preview builds should not touch the production database anyway.
// The migration runs on the deploy that does have DATABASE_URL (production).
if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL is not set — skipping migrations for this build.');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const [{ has_history }] = await prisma.$queryRawUnsafe(
    `SELECT (to_regclass('public._prisma_migrations') IS NOT NULL) AS has_history`,
  );
  // "Tenant" is a core table that exists in the very first schema; if it is
  // present the database already holds the full baseline schema.
  const [{ has_schema }] = await prisma.$queryRawUnsafe(
    `SELECT (to_regclass('public."Tenant"') IS NOT NULL) AS has_schema`,
  );

  if (!has_history && has_schema) {
    console.log(
      'Existing database without migration history detected — ' +
        `baselining "${BASELINE}" as already applied (P3005 prevention).`,
    );
    run(`npx prisma migrate resolve --applied ${BASELINE}`);
  }
} finally {
  await prisma.$disconnect();
}

run('npx prisma migrate deploy');

// Standaard AFAS-templates per subonderdeel aanmaken/bijwerken. Idempotent
// (upserts op stabiele id's). Faalt dit, dan mag de deploy niet stuklopen —
// de templates kunnen later met `npm run db:seed-templates` worden gezet.
try {
  run('npx tsx prisma/seed-templates.ts');
} catch (err) {
  console.warn('[deploy] Template-seed overgeslagen (niet-fataal):', err?.message ?? err);
}
