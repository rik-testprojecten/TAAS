import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "QUESTION", "RESOLVED", "REJECTED"]).optional(),
  impact: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  hasWorkaround: z.boolean().optional(),
  workaroundNote: z.string().optional(),
  businessAccepted: z.boolean().optional(),
  businessAcceptNote: z.string().optional(),
  retestRequired: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const issue = await prisma.issue.findFirst({
    where: { id, tenantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      runStep: {
        include: {
          run: {
            include: {
              flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(issue);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Fetch current issue to detect status transitions
  const issue = await prisma.issue.findFirst({
    where: { id, tenantId },
    include: {
      runStep: {
        include: { assignees: true },
      },
    },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isResolvingNow = parsed.data.status === "RESOLVED" && issue.status !== "RESOLVED";

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (isResolvingNow) updateData.retestRequired = true;

  await prisma.issue.update({ where: { id }, data: updateData });

  // When resolved: reset the step and create retest tasks
  if (isResolvingNow && issue.runStepId) {
    await prisma.runStep.updateMany({
      where: { id: issue.runStepId, tenantId },
      data: { status: "IN_PROGRESS", doneAt: null },
    });

    // Re-open assignee completions so they can retest
    await prisma.runStepAssignee.updateMany({
      where: { runStepId: issue.runStepId },
      data: { completedAt: null, completedStatus: null },
    });

    const assignees = issue.runStep?.assignees ?? [];
    if (assignees.length > 0) {
      await prisma.task.createMany({
        data: assignees.map((a) => ({
          tenantId,
          userId: a.userId,
          type: "RETEST" as const,
          title: `Hertest: ${issue.title}`,
          description: `Bevinding opgelost, hertest vereist voor stap.`,
          issueId: id,
          runStepId: issue.runStepId!,
          status: "OPEN" as const,
        })),
      });
    } else {
      // No assignees: retest task goes to the issue reporter
      await prisma.task.create({
        data: {
          tenantId,
          userId: issue.createdById,
          type: "RETEST",
          title: `Hertest: ${issue.title}`,
          description: `Bevinding opgelost, hertest vereist voor stap.`,
          issueId: id,
          runStepId: issue.runStepId,
          status: "OPEN",
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
