import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(2) });

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const runs = await prisma.testRun.findMany({
    where: { flowVersionId: id, tenantId },
    include: {
      steps: { include: { _count: { select: { issues: true } } } },
      _count: { select: { steps: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const version = await prisma.flowVersion.findFirst({
    where: { id, tenantId },
    include: {
      steps: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        include: { assignees: true },
      },
      flow: { include: { phase: true } },
    },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const run = await prisma.testRun.create({
    data: {
      flowVersionId: id,
      phaseId: version.flow.phaseId,
      projectId: version.flow.phase.projectId,
      tenantId,
      name: parsed.data.name,
      status: "DRAFT",
      steps: {
        create: version.steps.map((s) => ({
          tenantId,
          order: s.order,
          title: s.title,
          instruction: s.instruction,
          expectedResult: s.expectedResult,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  // Copy FlowStepAssignees → RunStepAssignees
  const runStepByOrder = new Map(run.steps.map((rs) => [rs.order, rs.id]));
  for (const flowStep of version.steps) {
    if (flowStep.assignees.length === 0) continue;
    const runStepId = runStepByOrder.get(flowStep.order);
    if (!runStepId) continue;
    await prisma.runStepAssignee.createMany({
      data: flowStep.assignees.map((a) => ({
        runStepId,
        userId: a.userId,
        tenantId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(run, { status: 201 });
}
