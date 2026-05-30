import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id } = await params;
  const { context } = result;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const target = await prisma.platformUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Voorkom dat een admin zichzelf degradeert van SUPER_ADMIN
  if (parsed.data.role && parsed.data.role !== "SUPER_ADMIN" && context.user.id === id) {
    return NextResponse.json(
      { error: "U kunt uw eigen SUPER_ADMIN rol niet verwijderen." },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;

  if (parsed.data.email !== undefined) {
    const newEmail = parsed.data.email.toLowerCase().trim();
    if (newEmail !== target.email.toLowerCase()) {
      const conflict = await prisma.platformUser.findFirst({
        where: { email: { equals: newEmail, mode: "insensitive" }, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json({ error: "E-mailadres al in gebruik" }, { status: 409 });
      }
      updateData.email = newEmail;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true });
  }

  await prisma.platformUser.update({ where: { id }, data: updateData });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id } = await params;
  const { context } = result;

  if (context.user.id === id) {
    return NextResponse.json({ error: "U kunt uw eigen account niet deactiveren." }, { status: 400 });
  }

  const target = await prisma.platformUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.platformUser.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
