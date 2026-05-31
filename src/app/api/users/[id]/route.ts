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
  isBlocked: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const isSelf = user.id === id;
  const isAdmin = user.roles.includes("TENANT_ADMIN");

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const { roles, isActive, isBlocked, name, email } = parsed.data;

  // Alleen beheerders mogen rollen, actief-status of blokkade wijzigen.
  if (!isAdmin && (roles !== undefined || isActive !== undefined || isBlocked !== undefined)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // Een beheerder mag zichzelf niet blokkeren of verwijderen (deactiveren).
  if (isSelf && (isBlocked === true || isActive === false)) {
    return NextResponse.json(
      { error: "U kunt uw eigen account niet blokkeren of verwijderen" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (isAdmin) {
    if (roles !== undefined) updateData.roles = roles;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;
  }

  if (email !== undefined) {
    const targetUser = await prisma.tenantUser.findFirst({ where: { id, tenantId } });
    if (!targetUser) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

    const newEmail = email.toLowerCase().trim();
    if (newEmail !== targetUser.email.toLowerCase()) {
      // Een gedeeld e-mailadres (bij meerdere klantomgevingen) mag alleen de
      // gebruiker zelf wijzigen — niet een beheerder van één omgeving.
      if (!isSelf) {
        const sharedCount = await prisma.tenantUser.count({
          where: { email: { equals: targetUser.email, mode: "insensitive" } },
        });
        if (sharedCount > 1) {
          return NextResponse.json(
            { error: "Dit e-mailadres is bij meerdere omgevingen geregistreerd. Alleen de gebruiker zelf mag dit wijzigen." },
            { status: 403 }
          );
        }
      }
      const conflict = await prisma.tenantUser.findFirst({
        where: { tenantId, email: newEmail, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json({ error: "Dit e-mailadres is al in gebruik binnen deze omgeving." }, { status: 409 });
      }
      updateData.email = newEmail;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true });
  }

  // updateMany met tenant-scope zodat kruis-klant-wijziging onmogelijk is.
  await prisma.tenantUser.updateMany({
    where: { id, tenantId },
    data: updateData,
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

  // Een beheerder mag zichzelf niet verwijderen.
  if (id === user.id) {
    return NextResponse.json({ error: "U kunt uw eigen account niet verwijderen" }, { status: 400 });
  }

  const target = await prisma.tenantUser.findFirst({ where: { id, tenantId } });
  if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

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
      // Reset 2FA-koppeling zodat er geen secret achterblijft.
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  await logAudit(tenantId, user.id, "ERASE", "TenantUser", target.id, null, null);
  return NextResponse.json({ success: true });
}
