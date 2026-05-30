import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.templateMainCategory.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const { id } = await params;
  const linked = await prisma.template.count({ where: { mainCategoryId: id } });
  if (linked > 0) {
    return NextResponse.json({ error: `Kan niet verwijderen: ${linked} template(s) gekoppeld` }, { status: 409 });
  }

  await prisma.templateMainCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
