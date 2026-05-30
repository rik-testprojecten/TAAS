import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const VALID_ROLES = ["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"] as const;

const updateSchema = z.object({
  roles: z.array(z.enum(VALID_ROLES)).min(1).optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;
  const body = await req.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  // Een beheerder mag zichzelf niet blokkeren of verwijderen.
  if (id === user.id && (parsed.data.isBlocked === true || parsed.data.isActive === false)) {
    return NextResponse.json(
      { error: "U kunt uw eigen account niet blokkeren of verwijderen" },
      { status: 400 }
    );
  }

  // Alleen gebruikers binnen de eigen klant kunnen worden gewijzigd.
  const target = await prisma.tenantUser.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  await prisma.tenantUser.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "U kunt uw eigen account niet verwijderen" }, { status: 400 });
  }

  const target = await prisma.tenantUser.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  // Zachte verwijdering: account wordt gedeactiveerd zodat audittrail,
  // bevindingen en toewijzingen behouden blijven. De gebruiker verdwijnt uit
  // de lijsten en kan niet meer inloggen.
  await prisma.tenantUser.update({
    where: { id },
    data: { isActive: false, mfaEnabled: false, mfaSecret: null },
  });
  return NextResponse.json({ success: true });
}
