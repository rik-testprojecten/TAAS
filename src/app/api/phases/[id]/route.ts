import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phase = await prisma.testPhase.findFirst({
    where: { id, tenantId },
    include: {
      project: {
        include: {
          phases: {
            select: { id: true, name: true, title: true, status: true },
            orderBy: { order: "asc" },
          },
        },
      },
      flows: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            include: {
              steps: { orderBy: { order: "asc" } },
              runs: { orderBy: { createdAt: "desc" }, take: 3 },
              _count: { select: { steps: true, runs: true } },
            },
          },
        },
      },
    },
  });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(phase);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;
  const body = await req.json();

  await prisma.testPhase.updateMany({
    where: { id, tenantId },
    data: { status: body.status },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phase = await prisma.testPhase.findFirst({ where: { id, tenantId } });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const versions = await tx.flowVersion.findMany({
      where: { flow: { phaseId: id, tenantId } },
      select: { id: true },
    });
    const versionIds = versions.map((v) => v.id);

    const runs = await tx.testRun.findMany({
      where: { flowVersionId: { in: versionIds } },
      select: { id: true },
    });
    const runIds = runs.map((r) => r.id);

    const runSteps = await tx.runStep.findMany({
      where: { runId: { in: runIds } },
      select: { id: true },
    });
    const runStepIds = runSteps.map((s) => s.id);

    const issues = await tx.issue.findMany({
      where: { runStepId: { in: runStepIds } },
      select: { id: true },
    });
    const issueIds = issues.map((i) => i.id);

    await tx.task.deleteMany({
      where: { OR: [{ runStepId: { in: runStepIds } }, { issueId: { in: issueIds } }] },
    });
    await tx.issue.deleteMany({ where: { id: { in: issueIds } } });
    await tx.runStepAssignee.deleteMany({ where: { runStepId: { in: runStepIds } } });
    await tx.runStep.deleteMany({ where: { id: { in: runStepIds } } });
    await tx.testRun.deleteMany({ where: { id: { in: runIds } } });
    await tx.testPhase.deleteMany({ where: { id, tenantId } });
  });

  return NextResponse.json({ success: true });
}
