import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const VALID_ROLES = ["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  roles: z.array(z.enum(VALID_ROLES)).min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id: tenantId, userId } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const { name, email, roles } = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (roles !== undefined) updateData.roles = roles;

  if (email !== undefined) {
    const targetUser = await prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!targetUser) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    const newEmail = email.toLowerCase().trim();
    if (newEmail !== targetUser.email.toLowerCase()) {
      const sharedCount = await prisma.tenantUser.count({ where: { email: targetUser.email } });
      if (sharedCount > 1) {
        return NextResponse.json(
          { error: "Dit e-mailadres is bij meerdere omgevingen geregistreerd. Alleen de gebruiker zelf mag dit wijzigen." },
          { status: 403 }
        );
      }
      const conflict = await prisma.tenantUser.findFirst({
        where: { tenantId, email: newEmail, NOT: { id: userId } },
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
    where: { id: userId, tenantId },
    data: updateData,
  });
  return NextResponse.json({ success: true });
}
