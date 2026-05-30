// Next.js instrumentation hook — runs once when a server instance boots, before
// any request is handled. It reconciles columns that a `db push`-created database
// may be missing (see src/lib/schema-reconcile.ts for the why).
//
// This is best-effort and only one of two safety nets: the login code path
// (resolve + authorize) also calls ensureSchema() directly, so a missing column
// is fixed even if this boot hook did not run on the serverless function that
// happens to handle the request.

export async function register() {
  // Only run on the Node.js server runtime (Prisma is not supported on Edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  const { ensureSchema } = await import("@/lib/schema-reconcile");
  await ensureSchema();
}
