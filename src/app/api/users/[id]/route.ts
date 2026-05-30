import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const VALID_ROLES = ["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"] as const;

const updateSchema = z.object({
  roles: z.array(z.enum(VALID_ROLES)).min(1).optional(),
  isActive: z.boolean().optional(),
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

  const { roles, isActive, name, email } = parsed.data;

  if (!isAdmin && (roles !== undefined || isActive !== undefined)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (isAdmin) {
    if (roles !== undefined) updateData.roles = roles;
    if (isActive !== undefined) updateData.isActive = isActive;
  }

  if (email !== undefined) {
    const targetUser = await prisma.tenantUser.findFirst({ where: { id, tenantId } });
    if (!targetUser) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    const newEmail = email.toLowerCase().trim();
    if (newEmail !== targetUser.email.toLowerCase()) {
      if (!isSelf) {
        const sharedCount = await prisma.tenantUser.count({ where: { email: targetUser.email } });
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

  await prisma.tenantUser.updateMany({
    where: { id, tenantId },
    data: updateData,
  });
  return NextResponse.json({ success: true });
}
