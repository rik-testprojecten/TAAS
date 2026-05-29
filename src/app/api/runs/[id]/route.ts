import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const run = await prisma.testRun.findFirst({
    where: { id, tenantId },
    include: {
      flowVersion: {
        include: {
          flow: { include: { phase: { include: { project: true } } } },
          steps: {
            where: { isArchived: false },
            select: { id: true, order: true, attachments: { select: { id: true, fileName: true, sizeBytes: true } } },
          },
        },
      },
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

const patchSchema = z.object({
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "ACCEPTED", "REJECTED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;
  const body = await req.json();

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "IN_PROGRESS") {
      updateData.startedAt = new Date();
      updateData.startedById = user.id;
    }
    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }

  await prisma.testRun.updateMany({ where: { id, tenantId }, data: updateData });

  // When run starts, create STEP_EXECUTION tasks for first step's assignees
  if (parsed.data.status === "IN_PROGRESS") {
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
