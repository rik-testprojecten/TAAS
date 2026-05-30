import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[A-Z0-9_]+$/, "Alleen hoofdletters, cijfers en underscore"),
  order: z.number().int().optional(),
});

export async function GET() {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;

  const categories = await prisma.templateMainCategory.findMany({
    include: {
      subCategories: { orderBy: { order: "asc" } },
      _count: { select: { templates: true } },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.templateMainCategory.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "Slug al in gebruik" }, { status: 409 });

  const maxOrder = await prisma.templateMainCategory.aggregate({ _max: { order: true } });
  const category = await prisma.templateMainCategory.create({
    data: { ...parsed.data, order: parsed.data.order ?? (maxOrder._max.order ?? 0) + 1 },
  });
  return NextResponse.json(category, { status: 201 });
}
