// Runtime schema reconciliation.
//
// The deployed database was created with `prisma db push` and can be missing
// columns that exist in prisma/schema.prisma — RunStep.parentRunStepId /
// threadInitiatorId (threaded steps), Attachment.flowStepId (flow-step
// attachments) and the user-blocking / 2FA columns (Tenant.mfaRequired,
// TenantUser.isBlocked / mfaEnabled / mfaSecret). That causes Prisma error
// P2022 at runtime. Migrations cannot run during the Vercel build because
// DATABASE_URL is not available there, so we reconcile at runtime instead.
//
// This is callable from two places:
//  1. the instrumentation boot hook (best-effort, once per server boot), and
//  2. directly in the login code path (resolve + authorize), so the columns are
//     guaranteed to exist right before the query that needs them — independent
//     of whether/when the boot hook ran on this particular serverless function.
//
// All statements are idempotent (ADD COLUMN IF NOT EXISTS + pg_constraint
// guards). A fast pre-check short-circuits once every column is present, and the
// whole thing is memoized per process so steady-state requests pay at most one
// cheap COUNT query (and zero once it has confirmed the schema is in sync).

import { prisma } from "@/lib/prisma";

const REQUIRED: Array<{ table: string; column: string }> = [
  { table: "RunStep", column: "parentRunStepId" },
  { table: "RunStep", column: "threadInitiatorId" },
  { table: "Attachment", column: "flowStepId" },
  { table: "Tenant", column: "mfaRequired" },
  { table: "TenantUser", column: "isBlocked" },
  { table: "TenantUser", column: "mfaEnabled" },
  { table: "TenantUser", column: "mfaSecret" },
];

// Once the schema is confirmed in sync we never touch the database again.
let confirmed = false;
// In-flight reconcile shared across concurrent callers in the same process.
let inflight: Promise<void> | null = null;

async function reconcile(): Promise<void> {
  const present = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM information_schema.columns
     WHERE (table_name, column_name) IN (${REQUIRED.map(
       (r) => `('${r.table}', '${r.column}')`,
     ).join(", ")})`,
  );
  if (Number(present[0]?.count ?? 0) >= REQUIRED.length) return; // already in sync

  console.warn("[schema-reconcile] Missing columns detected — applying schema fix.");

  await prisma.$executeRawUnsafe(`ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "parentRunStepId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "threadInitiatorId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "flowStepId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT`);
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

/**
 * Ensures the reconcilable columns exist before a query relies on them.
 *
 * Best-effort: it never throws. On success it is memoized for the lifetime of
 * the process; on failure the memo resets so a later request can retry (and the
 * underlying query will surface the real error if columns are still missing).
 */
export async function ensureSchema(): Promise<void> {
  if (confirmed) return;
  if (!process.env.DATABASE_URL) return;
  if (!inflight) inflight = reconcile();
  try {
    await inflight;
    confirmed = true;
  } catch (err) {
    console.error("[schema-reconcile] Failed to apply schema fix:", err);
    inflight = null; // allow a retry on the next call
  }
}
