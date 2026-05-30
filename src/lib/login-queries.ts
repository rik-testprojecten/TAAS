// Resilient login lookups.
//
// The login path needs columns that a `db push`-created production database may
// still be missing (Tenant.mfaRequired, TenantUser.isBlocked / mfaEnabled /
// mfaSecret). We first try to reconcile the schema, then query normally. If the
// columns are *still* missing (e.g. the runtime ALTER could not run), we fall
// back to a query that only references guaranteed columns and treats the missing
// ones as their schema defaults — so a user can always log in. Blocking and
// mandatory-2FA simply degrade to "off" for the short window until the columns
// exist; once ensureSchema() (or a migration) adds them, full behaviour returns.

import { prisma } from "@/lib/prisma";
import { ensureSchema } from "@/lib/schema-reconcile";

export type TenantLoginCandidate = {
  id: string;
  name: string;
  password: string;
  roles: string[];
  tenantId: string;
  tenantName: string;
  tenantActive: boolean;
  isBlocked: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
};

function isMissingColumn(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: string }).code === "P2022"
  );
}

/**
 * Returns all *active* tenant accounts for an email, normalized so callers never
 * have to care whether the blocking/2FA columns physically exist yet.
 */
export async function getTenantLoginCandidates(
  email: string
): Promise<TenantLoginCandidate[]> {
  await ensureSchema();

  try {
    const rows = await prisma.tenantUser.findMany({
      where: { email, isActive: true },
      include: { tenant: { select: { id: true, name: true, isActive: true, mfaRequired: true } } },
    });
    return rows.map((tu) => ({
      id: tu.id,
      name: tu.name,
      password: tu.password,
      roles: tu.roles,
      tenantId: tu.tenantId,
      tenantName: tu.tenant.name,
      tenantActive: tu.tenant.isActive,
      isBlocked: tu.isBlocked,
      mfaRequired: tu.tenant.mfaRequired,
      mfaEnabled: tu.mfaEnabled,
      mfaSecret: tu.mfaSecret,
    }));
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    // Degraded fallback — select only columns that are guaranteed to exist.
    console.error(
      "[login-queries] Blocking/2FA columns missing — using degraded login query.",
      e
    );
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        password: string;
        roles: string[];
        tenantId: string;
        tenantName: string;
        tenantActive: boolean;
      }>
    >`
      SELECT tu."id", tu."name", tu."password", tu."roles", tu."tenantId",
             t."name" AS "tenantName", t."isActive" AS "tenantActive"
      FROM "TenantUser" tu
      JOIN "Tenant" t ON t."id" = tu."tenantId"
      WHERE tu."email" = ${email} AND tu."isActive" = true
    `;
    return rows.map((r) => ({
      ...r,
      isBlocked: false,
      mfaRequired: false,
      mfaEnabled: false,
      mfaSecret: null,
    }));
  }
}
