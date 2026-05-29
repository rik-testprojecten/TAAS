import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  expectedResult: z.string().optional(),
  order: z.number().optional(),
  afterStepId: z.string().optional(),
  beforeStepId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  attachmentIds: z.array(z.string()).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const steps = await prisma.flowStep.findMany({
    where: { flowVersionId: id, tenantId, isArchived: false },
    orderBy: { order: "asc" },
    include: { assignees: { include: { user: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(steps);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const version = await prisma.flowVersion.findFirst({ where: { id, tenantId } });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const hasRuns = await prisma.testRun.findFirst({ where: { flowVersionId: id } });
  if (hasRuns) return NextResponse.json({ error: "Cannot edit version with existing runs. Create a new version." }, { status: 409 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let insertOrder: number;

  if (parsed.data.afterStepId) {
    const afterStep = await prisma.flowStep.findUnique({ where: { id: parsed.data.afterStepId } });
    if (!afterStep) return NextResponse.json({ error: "afterStepId not found" }, { status: 404 });
    await prisma.flowStep.updateMany({
      where: { flowVersionId: id, order: { gt: afterStep.order } },
      data: { order: { increment: 1 } },
    });
    insertOrder = afterStep.order + 1;
  } else if (parsed.data.beforeStepId) {
    const beforeStep = await prisma.flowStep.findUnique({ where: { id: parsed.data.beforeStepId } });
    if (!beforeStep) return NextResponse.json({ error: "beforeStepId not found" }, { status: 404 });
    await prisma.flowStep.updateMany({
      where: { flowVersionId: id, order: { gte: beforeStep.order } },
      data: { order: { increment: 1 } },
    });
    insertOrder = beforeStep.order;
  } else {
    const maxOrder = await prisma.flowStep.aggregate({ where: { flowVersionId: id }, _max: { order: true } });
    insertOrder = parsed.data.order ?? (maxOrder._max.order ?? 0) + 1;
  }

  const step = await prisma.flowStep.create({
    data: {
      flowVersionId: id,
      tenantId,
      title: parsed.data.title,
      instruction: parsed.data.instruction,
      expectedResult: parsed.data.expectedResult,
      order: insertOrder,
    },
  });

  if (parsed.data.assigneeIds && parsed.data.assigneeIds.length > 0) {
    await prisma.flowStepAssignee.createMany({
      data: parsed.data.assigneeIds.map((userId) => ({ flowStepId: step.id, userId, tenantId })),
      skipDuplicates: true,
    });
  }

  if (parsed.data.attachmentIds && parsed.data.attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: parsed.data.attachmentIds }, tenantId, flowStepId: null, runStepId: null, issueId: null },
      data: { flowStepId: step.id },
    });
  }

  return NextResponse.json(step, { status: 201 });
}
