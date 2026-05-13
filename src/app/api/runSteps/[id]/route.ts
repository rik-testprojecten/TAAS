import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "PASSED", "FAILED", "BLOCKED"]).optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
});

const TERMINAL = ["PASSED", "FAILED", "BLOCKED"] as const;
type TerminalStatus = (typeof TERMINAL)[number];

function isTerminal(s: string): s is TerminalStatus {
  return (TERMINAL as readonly string[]).includes(s);
}

async function createTasksForStep(runStepId: string, stepTitle: string, tenantId: string) {
  const assignees = await prisma.runStepAssignee.findMany({ where: { runStepId } });
  for (const a of assignees) {
    const existing = await prisma.task.findFirst({
      where: { runStepId, userId: a.userId, type: "STEP_EXECUTION", status: { not: "DONE" } },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          tenantId,
          userId: a.userId,
          type: "STEP_EXECUTION",
          title: `Voer stap uit: ${stepTitle}`,
          runStepId,
          status: "OPEN",
        },
      });
    }
  }
}

async function advanceToNextStep(runId: string, completedOrder: number, tenantId: string) {
  const nextStep = await prisma.runStep.findFirst({
    where: { runId, tenantId, order: { gt: completedOrder }, status: "PENDING" },
    orderBy: { order: "asc" },
  });
  if (nextStep) {
    await createTasksForStep(nextStep.id, nextStep.title, tenantId);
  }
}

async function checkAndFinalizeRun(runId: string) {
  const allSteps = await prisma.runStep.findMany({ where: { runId } });
  const allDone = allSteps.every((s) => isTerminal(s.status));
  if (allDone) {
    await prisma.testRun.updateMany({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const step = await prisma.runStep.findFirst({
    where: { id, tenantId },
    include: { assignees: true },
  });
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const terminal = parsed.data.status && isTerminal(parsed.data.status);

  // Auto-start the run when first step goes IN_PROGRESS
  if (parsed.data.status === "IN_PROGRESS") {
    await prisma.testRun.updateMany({
      where: { id: step.runId, status: "DRAFT" },
      data: { status: "IN_PROGRESS", startedAt: new Date(), startedById: user.id },
    });
  }

  const myAssignee = step.assignees.find((a) => a.userId === user.id);

  if (step.assignees.length > 0 && terminal && parsed.data.status) {
    // Multi-assignee path: track per-person completion
    if (myAssignee) {
      await prisma.runStepAssignee.update({
        where: { id: myAssignee.id },
        data: { completedAt: new Date(), completedStatus: parsed.data.status },
      });
    }

    // Save result/notes on the step (last submitter wins)
    const stepUpdate: Record<string, unknown> = {};
    if (parsed.data.result !== undefined) stepUpdate.result = parsed.data.result;
    if (parsed.data.notes !== undefined) stepUpdate.notes = parsed.data.notes;
    if (Object.keys(stepUpdate).length > 0) {
      await prisma.runStep.updateMany({ where: { id, tenantId }, data: stepUpdate });
    }

    // Close this user's open task for the step
    await prisma.task.updateMany({
      where: { runStepId: id, userId: user.id, type: "STEP_EXECUTION", status: { not: "DONE" } },
      data: { status: "DONE" },
    });

    // Check if ALL assignees have completed
    const allAssignees = await prisma.runStepAssignee.findMany({ where: { runStepId: id } });
    const allDone = allAssignees.every((a) => a.completedAt !== null);

    if (allDone) {
      // Determine final status: BLOCKED wins over FAILED wins over PASSED
      const statuses = allAssignees.map((a) => a.completedStatus as string);
      const finalStatus: TerminalStatus = statuses.includes("BLOCKED")
        ? "BLOCKED"
        : statuses.includes("FAILED")
        ? "FAILED"
        : "PASSED";

      await prisma.runStep.updateMany({
        where: { id, tenantId },
        data: { status: finalStatus, doneById: user.id, doneAt: new Date() },
      });

      await advanceToNextStep(step.runId, step.order, tenantId);
      await checkAndFinalizeRun(step.runId);
    }
  } else {
    // No-assignee path or non-terminal status: update step directly
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (terminal) {
      updateData.doneById = user.id;
      updateData.doneAt = new Date();
    }
    await prisma.runStep.updateMany({ where: { id, tenantId }, data: updateData });

    if (terminal) {
      await advanceToNextStep(step.runId, step.order, tenantId);
      await checkAndFinalizeRun(step.runId);
      // Close any open STEP_EXECUTION task for this user on this step
      await prisma.task.updateMany({
        where: { runStepId: id, userId: user.id, type: "STEP_EXECUTION", status: { not: "DONE" } },
        data: { status: "DONE" },
      });
    }
  }

  return NextResponse.json({ success: true });
}
