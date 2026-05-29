import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, roles: true, isActive: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  mfaRequired: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const tenant = await prisma.tenant.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(tenant);
}
