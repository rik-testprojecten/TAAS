import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["HR", "FIN", "INKOOP", "ALG"]).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  // Onderdelen (modules/subonderdelen) waaraan dit template gekoppeld is.
  // De keys verwijzen naar MODULES/submodules uit src/lib/modules.ts.
  moduleKeys: z.array(z.string().min(1)).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      moduleLinks: { select: { moduleKey: true } },
    },
  });
  if (!template) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { moduleKeys, ...fields } = parsed.data;

  if (Object.keys(fields).length > 0) {
    await prisma.template.update({ where: { id }, data: fields });
  }

  // Onderdelen-koppelingen volledig vervangen door de aangeleverde set.
  if (moduleKeys) {
    const unique = [...new Set(moduleKeys)];
    await prisma.$transaction([
      prisma.templateModuleLink.deleteMany({ where: { templateId: id } }),
      ...(unique.length > 0
        ? [
            prisma.templateModuleLink.createMany({
              data: unique.map((moduleKey) => ({ templateId: id, moduleKey })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  const updated = await prisma.template.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
      moduleLinks: { select: { moduleKey: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id } = await params;

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
