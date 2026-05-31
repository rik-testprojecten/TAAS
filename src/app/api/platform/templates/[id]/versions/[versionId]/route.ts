import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";

const stepSchema = z.object({
  order: z.number(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  expectedResult: z.string().optional().nullable(),
});

const patchSchema = z.object({
  version: z.string().min(1).optional(),
  changelog: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  // Wordt meegegeven, dan worden de stappen volledig vervangen.
  steps: z.array(stepSchema).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id, versionId } = await params;

  const version = await prisma.templateVersion.findFirst({
    where: { id: versionId, templateId: id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!version) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(version);
}

// Onderhouden van een bestaande templateversie: velden bijwerken en/of de
// stappen volledig vervangen.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;
  const { id, versionId } = await params;

  const version = await prisma.templateVersion.findFirst({ where: { id: versionId, templateId: id } });
  if (!version) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { steps, ...fields } = parsed.data;

  if (Object.keys(fields).length > 0) {
    await prisma.templateVersion.update({ where: { id: versionId }, data: fields });
  }

  if (steps) {
    await prisma.$transaction([
      prisma.templateStep.deleteMany({ where: { templateVersionId: versionId } }),
      ...(steps.length > 0
        ? [
            prisma.templateStep.createMany({
              data: steps.map((s, i) => ({
                templateVersionId: versionId,
                order: s.order ?? i + 1,
                title: s.title,
                instruction: s.instruction,
                expectedResult: s.expectedResult ?? null,
              })),
            }),
          ]
        : []),
    ]);
  }

  const updated = await prisma.templateVersion.findUnique({
    where: { id: versionId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(updated);
}
