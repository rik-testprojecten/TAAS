// Next.js instrumentation hook — runs once when a server instance boots, before
// any request is handled.
//
// Why this exists: the deployed database was created with `prisma db push` and is
// missing columns that exist in prisma/schema.prisma — RunStep.parentRunStepId /
// threadInitiatorId (threaded steps), Attachment.flowStepId (flow-step attachments)
// and the user-blocking / 2FA columns (Tenant.mfaRequired, TenantUser.isBlocked /
// mfaEnabled / mfaSecret) — which causes Prisma error P2022 at runtime. Migrations
// cannot be applied during the Vercel build because DATABASE_URL is not available
// there, so we reconcile the schema here, at runtime, where the connection exists.
//
// The statements are idempotent (ADD COLUMN IF NOT EXISTS + pg_constraint guards),
// and a fast pre-check short-circuits once the columns are present, so steady-state
// boots only run a single cheap query. Once a proper migration has been applied to
// the database through another channel, this hook simply becomes a no-op and can be
// removed.

export async function register() {
  // Only run on the Node.js server runtime (Prisma is not supported on Edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  const { prisma } = await import("@/lib/prisma");

  // Alle kolommen die in een via `db push` aangemaakte database kunnen ontbreken.
  // De pre-check telt hoeveel hiervan al bestaan; pas wanneer ze er állemaal zijn
  // wordt de hook een no-op. Zo worden ook later toegevoegde kolommen (blokkeren /
  // 2FA) gereconcilieerd, ook als de threaded-steps-kolommen al aanwezig waren.
  const required: Array<{ table: string; column: string }> = [
    { table: "RunStep", column: "parentRunStepId" },
    { table: "RunStep", column: "threadInitiatorId" },
    { table: "Attachment", column: "flowStepId" },
    { table: "Tenant", column: "mfaRequired" },
    { table: "TenantUser", column: "isBlocked" },
    { table: "TenantUser", column: "mfaEnabled" },
    { table: "TenantUser", column: "mfaSecret" },
  ];

  try {
    const present = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::int AS count FROM information_schema.columns
       WHERE (table_name, column_name) IN (${required
         .map((r) => `('${r.table}', '${r.column}')`)
         .join(", ")})`,
    );
    if (Number(present[0]?.count ?? 0) >= required.length) return; // already reconciled

    console.warn(
      "[instrumentation] Missing columns detected — applying schema fix.",
    );

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "parentRunStepId" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "threadInitiatorId" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "flowStepId" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN NOT NULL DEFAULT false`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT`,
    );
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

    console.warn("[instrumentation] Schema fix applied successfully.");
  } catch (err) {
    console.error("[instrumentation] Failed to apply schema fix:", err);
  }
}
