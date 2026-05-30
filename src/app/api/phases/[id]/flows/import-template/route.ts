import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  templateVersionId: z.string(),
  name: z.string().min(2),
  moduleKey: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phase = await prisma.testPhase.findFirst({ where: { id, tenantId } });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const templateVersion = await prisma.templateVersion.findUnique({
    where: { id: parsed.data.templateVersionId },
    include: {
      steps: { orderBy: { order: "asc" } },
      template: { include: { moduleLinks: { select: { moduleKey: true } } } },
    },
  });
  if (!templateVersion) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Subonderdeel: expliciet meegegeven, anders overnemen van de template-koppeling.
  const moduleKey =
    parsed.data.moduleKey !== undefined
      ? parsed.data.moduleKey
      : templateVersion.template.moduleLinks[0]?.moduleKey ?? null;

  const flow = await prisma.flow.create({
    data: {
      name: parsed.data.name,
      phaseId: id,
      tenantId,
      moduleKey,
      sourceTemplateVersionId: templateVersion.id,
      versions: {
        create: {
          tenantId,
          version: "v1.0",
          steps: {
            create: templateVersion.steps.map((s) => ({
              tenantId,
              order: s.order,
              title: s.title,
              instruction: s.instruction,
              expectedResult: s.expectedResult,
            })),
          },
        },
      },
    },
    include: {
      versions: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });
  return NextResponse.json(flow, { status: 201 });
}
