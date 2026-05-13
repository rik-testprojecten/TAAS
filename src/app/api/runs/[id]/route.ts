import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const run = await prisma.testRun.findFirst({
    where: { id, tenantId },
    include: {
      flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignees: {
            include: { user: { select: { id: true, name: true } } },
          },
          issues: {
            include: {
              createdBy: { select: { id: true, name: true } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "IN_PROGRESS") {
      updateData.startedAt = new Date();
      updateData.startedById = user.id;
    }
    if (body.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }

  await prisma.testRun.updateMany({ where: { id, tenantId }, data: updateData });

  // When run starts, create STEP_EXECUTION tasks for first step's assignees
  if (body.status === "IN_PROGRESS") {
    const firstStep = await prisma.runStep.findFirst({
      where: { runId: id, tenantId },
      include: { assignees: true },
      orderBy: { order: "asc" },
    });
    if (firstStep && firstStep.assignees.length > 0) {
      for (const assignee of firstStep.assignees) {
        const existing = await prisma.task.findFirst({
          where: { runStepId: firstStep.id, userId: assignee.userId, type: "STEP_EXECUTION", status: { not: "DONE" } },
        });
        if (!existing) {
          await prisma.task.create({
            data: {
              tenantId,
              userId: assignee.userId,
              type: "STEP_EXECUTION",
              title: `Voer stap uit: ${firstStep.title}`,
              runStepId: firstStep.id,
              status: "OPEN",
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
