import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { MAIN_CATEGORY_KEYS, SUB_CATEGORY_KEYS } from "@/lib/modules";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));
  const skip = (page - 1) * pageSize;

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      include: {
        versions: { orderBy: { createdAt: "desc" }, take: 1 },
        moduleLinks: { select: { moduleKey: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.template.count(),
  ]);

  return NextResponse.json({ data: templates, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { moduleLinks, ...templateData } = parsed.data;
  const template = await prisma.template.create({
    data: {
      ...templateData,
      moduleLinks: moduleLinks?.length
        ? { create: moduleLinks.map((key) => ({ moduleKey: key })) }
        : undefined,
    },
    include: { moduleLinks: { select: { moduleKey: true } } },
  });
  return NextResponse.json(template, { status: 201 });
}
