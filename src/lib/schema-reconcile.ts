// Runtime schema reconciliation.
//
// The deployed database was created with `prisma db push` and can be missing
// columns that exist in prisma/schema.prisma. All statements are idempotent
// (ADD COLUMN IF NOT EXISTS + pg_constraint guards). A fast pre-check
// short-circuits once every column is present.

import { prisma } from "@/lib/prisma";

const REQUIRED: Array<{ table: string; column: string }> = [
  { table: "RunStep", column: "parentRunStepId" },
  { table: "RunStep", column: "threadInitiatorId" },
  { table: "Attachment", column: "flowStepId" },
  { table: "Tenant", column: "mfaRequired" },
  { table: "TenantUser", column: "isBlocked" },
  { table: "TenantUser", column: "mfaEnabled" },
  { table: "TenantUser", column: "mfaSecret" },
  { table: "Flow", column: "moduleKey" },
  { table: "Issue", column: "moduleKey" },
  { table: "Template", column: "category" },
];

const REQUIRED_TABLES: string[] = [];

let confirmed = false;
let inflight: Promise<void> | null = null;

async function reconcile(): Promise<void> {
  const [cols, tables] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM information_schema.columns
       WHERE (table_name, column_name) IN (${REQUIRED.map(
         (r) => `('${r.table}', '${r.column}')`,
       ).join(", ")})`,
    ),
    REQUIRED_TABLES.length > 0
      ? prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*)::int AS count FROM information_schema.tables
           WHERE table_name IN (${REQUIRED_TABLES.map((t) => `'${t}'`).join(", ")})`,
        )
      : Promise.resolve([{ count: 0 }]),
  ]);
  const columnsOk = Number(cols[0]?.count ?? 0) >= REQUIRED.length;
  const tablesOk = REQUIRED_TABLES.length === 0 || Number(tables[0]?.count ?? 0) >= REQUIRED_TABLES.length;
  if (columnsOk && tablesOk) return;

  console.warn("[schema-reconcile] Missing columns/tables detected — applying schema fix.");

  await prisma.$executeRawUnsafe(`ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "parentRunStepId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "threadInitiatorId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "flowStepId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Flow" ADD COLUMN IF NOT EXISTS "moduleKey" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "moduleKey" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'ALG'`);

  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RunStep_parentRunStepId_fkey') THEN
         ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_parentRunStepId_fkey"
           FOREIGN KEY ("parentRunStepId") REFERENCES "RunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF;
     END $$;`,
  );
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attachment_flowStepId_fkey') THEN
         ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_flowStepId_fkey"
           FOREIGN KEY ("flowStepId") REFERENCES "FlowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF;
     END $$;`,
  );

  console.warn("[schema-reconcile] Schema fix applied successfully.");
}

export async function ensureSchema(): Promise<void> {
  if (confirmed) return;
  if (!process.env.DATABASE_URL) return;
  if (!inflight) inflight = reconcile();
  try {
    await inflight;
    confirmed = true;
  } catch (err) {
    console.error("[schema-reconcile] Failed to apply schema fix:", err);
    inflight = null;
  }
}
