import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const VALID_ROLES = ["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"] as const;

const updateSchema = z.object({
  roles: z.array(z.enum(VALID_ROLES)).min(1).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;
  const body = await req.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  await prisma.tenantUser.updateMany({
    where: { id, tenantId },
    data: parsed.data,
  });
  return NextResponse.json({ success: true });
}

// GDPR erasure (right to be forgotten). The user is anonymized rather than hard-
// deleted so test history, issues and audit trail keep referential integrity.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const target = await prisma.tenantUser.findFirst({ where: { id, tenantId } });
  if (!target) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Never allow removing the last active tenant admin (would lock out the tenant).
  if (target.roles.includes("TENANT_ADMIN") && target.isActive) {
    const activeAdmins = await prisma.tenantUser.count({
      where: { tenantId, isActive: true, roles: { has: "TENANT_ADMIN" } },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "Kan de laatste actieve beheerder niet verwijderen" },
        { status: 400 },
      );
    }
  }

  await prisma.tenantUser.update({
    where: { id: target.id },
    data: {
      name: "Verwijderde gebruiker",
      email: `verwijderd-${target.id}@anonymized.local`,
      // Invalidate credentials so the account can never authenticate again.
      password: `deleted:${randomUUID()}`,
      isActive: false,
      roles: [],
    },
  });

  await logAudit(tenantId, user.id, "ERASE", "TenantUser", target.id, null, null);
  return NextResponse.json({ success: true });
}
