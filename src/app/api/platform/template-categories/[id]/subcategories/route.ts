import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[A-Z0-9_]+$/, "Alleen hoofdletters, cijfers en underscore"),
  order: z.number().int().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const { id: mainCategoryId } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.templateSubCategory.findUnique({
    where: { mainCategoryId_slug: { mainCategoryId, slug: parsed.data.slug } },
  });
  if (existing) return NextResponse.json({ error: "Slug al in gebruik in deze categorie" }, { status: 409 });

  const maxOrder = await prisma.templateSubCategory.aggregate({
    where: { mainCategoryId },
    _max: { order: true },
  });
  const sub = await prisma.templateSubCategory.create({
    data: { ...parsed.data, mainCategoryId, order: parsed.data.order ?? (maxOrder._max.order ?? 0) + 1 },
  });
  return NextResponse.json(sub, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const body = await req.json();
  const { subId, ...rest } = body;
  if (!subId) return NextResponse.json({ error: "subId vereist" }, { status: 400 });

  const parsed = updateSchema.safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sub = await prisma.templateSubCategory.update({ where: { id: subId }, data: parsed.data });
  return NextResponse.json(sub);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const { searchParams } = new URL(req.url);
  const subId = searchParams.get("subId");
  if (!subId) return NextResponse.json({ error: "subId vereist" }, { status: 400 });

  const linked = await prisma.template.count({ where: { subCategoryId: subId } });
  if (linked > 0) {
    return NextResponse.json({ error: `Kan niet verwijderen: ${linked} template(s) gekoppeld` }, { status: 409 });
  }

  await prisma.templateSubCategory.delete({ where: { id: subId } });
  return new NextResponse(null, { status: 204 });
}
