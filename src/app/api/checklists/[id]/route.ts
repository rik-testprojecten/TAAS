import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(z.object({ id: z.string().optional(), label: z.string().min(1), checked: z.boolean().optional() })).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const checklist = await prisma.phaseChecklist.findFirst({ where: { id, tenantId } });
  if (!checklist) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.phaseChecklist.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.items ? {
        items: {
          deleteMany: {},
          create: parsed.data.items.map((item, i) => ({
            label: item.label,
            order: i + 1,
            checked: item.checked ?? false,
          })),
        },
      } : {}),
    },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const checklist = await prisma.phaseChecklist.findFirst({ where: { id, tenantId } });
  if (!checklist) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.phaseChecklist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
