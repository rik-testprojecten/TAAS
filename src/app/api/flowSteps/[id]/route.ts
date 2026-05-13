import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  instruction: z.string().min(1).optional(),
  expectedResult: z.string().optional(),
  isArchived: z.boolean().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const step = await prisma.flowStep.findFirst({ where: { id, tenantId } });
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasRuns = await prisma.testRun.findFirst({ where: { flowVersionId: step.flowVersionId } });
  if (hasRuns) return NextResponse.json({ error: "Cannot edit steps with existing runs. Create a new version." }, { status: 409 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { assigneeIds, ...stepData } = parsed.data;

  if (Object.keys(stepData).length > 0) {
    await prisma.flowStep.update({ where: { id }, data: stepData });
  }

  if (assigneeIds !== undefined) {
    await prisma.flowStepAssignee.deleteMany({ where: { flowStepId: id } });
    if (assigneeIds.length > 0) {
      await prisma.flowStepAssignee.createMany({
        data: assigneeIds.map((userId) => ({ flowStepId: id, userId, tenantId })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.flowStep.findFirst({
    where: { id },
    include: { assignees: { include: { user: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const step = await prisma.flowStep.findFirst({ where: { id, tenantId } });
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasRuns = await prisma.testRun.findFirst({ where: { flowVersionId: step.flowVersionId } });
  if (hasRuns) {
    await prisma.flowStep.update({ where: { id }, data: { isArchived: true } });
  } else {
    await prisma.flowStep.delete({ where: { id } });
  }
  return NextResponse.json({ success: true });
}
