import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
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
  // Alleen primaire RunSteps (geen thread-instanties)
  const nextStep = await prisma.runStep.findFirst({
    where: { runId, tenantId, order: { gt: completedOrder }, status: "PENDING", parentRunStepId: null },
    orderBy: { order: "asc" },
  });
  if (nextStep) {
    await createTasksForStep(nextStep.id, nextStep.title, tenantId);
  }
}

async function createThreadedNextStep(
  currentStep: { id: string; runId: string; order: number },
  tenantId: string,
  threadInitiatorId: string
) {
  const run = await prisma.testRun.findUnique({
    where: { id: currentStep.runId },
    include: {
      flowVersion: {
        include: {
          steps: {
            where: { order: { gt: currentStep.order }, isArchived: false },
            orderBy: { order: "asc" },
            take: 1,
            include: { assignees: true },
          },
        },
      },
    },
  });

  const nextFlowStep = run?.flowVersion?.steps?.[0];
  if (!nextFlowStep) return;

  // Initiator-routing: initiator krijgt de taak als hij assignee is van volgende stap;
  // anders gaan alle assignees de taak krijgen (bijv. Marisha die niet de thread-starter is)
  const allAssigneeIds = nextFlowStep.assignees.map((a) => a.userId);
  const initiatorIsAssignee = allAssigneeIds.includes(threadInitiatorId);
  const targetUserIds = initiatorIsAssignee ? [threadInitiatorId] : allAssigneeIds;

  const newRunStep = await prisma.runStep.create({
    data: {
      runId: currentStep.runId,
      tenantId,
      order: nextFlowStep.order,
      title: nextFlowStep.title,
      instruction: nextFlowStep.instruction,
      expectedResult: nextFlowStep.expectedResult ?? undefined,
      parentRunStepId: currentStep.id,
      threadInitiatorId,
      status: "PENDING",
    },
  });

  if (targetUserIds.length > 0) {
    await prisma.runStepAssignee.createMany({
      data: targetUserIds.map((userId) => ({
        runStepId: newRunStep.id,
        userId,
        tenantId,
      })),
    });
    await createTasksForStep(newRunStep.id, newRunStep.title, tenantId);
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
  const { attachmentIds, ...rest } = body;
  const parsed = updateSchema.safeParse(rest);
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

    // Close this user's own tasks (STEP_EXECUTION and RETEST) for this step
    await prisma.task.updateMany({
      where: { runStepId: id, userId: user.id, type: { in: ["STEP_EXECUTION", "RETEST"] }, status: { not: "DONE" } },
      data: { status: "DONE" },
    });

    // Fetch all assignees to check how many have now completed
    const allAssignees = await prisma.runStepAssignee.findMany({ where: { runStepId: id } });
    const completedAssignees = allAssignees.filter((a) => a.completedAt !== null);
    const isFirstCompletion = completedAssignees.length === 1;

    if (isFirstCompletion) {
      // First tester to complete: mark step terminal and advance run
      const finalStatus = parsed.data.status as TerminalStatus;

      await prisma.runStep.updateMany({
        where: { id, tenantId },
        data: { status: finalStatus, doneById: user.id, doneAt: new Date() },
      });

      // Other testers keep their own tasks open so they can still complete independently

      // Clear any pending retests on this step (hertest is done)
      await prisma.issue.updateMany({
        where: { runStepId: id, retestRequired: true },
        data: { retestRequired: false },
      });

      if (step.parentRunStepId) {
        // Threaded RunStep: doorgeven met dezelfde initiator
        await createThreadedNextStep(step, tenantId, step.threadInitiatorId!);
      } else {
        // Primaire RunStep: gebruik de bestaande primaire RunStep voor de volgende stap
        await advanceToNextStep(step.runId, step.order, tenantId);
      }

      await checkAndFinalizeRun(step.runId);
    } else {
      // Niet de eerste completion op een primaire stap: start een nieuwe thread
      // (alleen zinvol voor primaire RunSteps; threaded steps hebben 1 doelgebruiker)
      if (!step.parentRunStepId) {
        await createThreadedNextStep(step, tenantId, user.id);
      }
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
      // Clear any pending retests on this step
      await prisma.issue.updateMany({
        where: { runStepId: id, retestRequired: true },
        data: { retestRequired: false },
      });

      if (step.parentRunStepId) {
        await createThreadedNextStep(step, tenantId, step.threadInitiatorId!);
      } else {
        await advanceToNextStep(step.runId, step.order, tenantId);
      }
      await checkAndFinalizeRun(step.runId);
      // Close this user's own tasks (STEP_EXECUTION and RETEST) for this step
      await prisma.task.updateMany({
        where: { runStepId: id, userId: user.id, type: { in: ["STEP_EXECUTION", "RETEST"] }, status: { not: "DONE" } },
        data: { status: "DONE" },
      });
    }
  }

  if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, tenantId, runStepId: null },
      data: { runStepId: id },
    });
  }

  await logAudit(tenantId, user.id, "STEP_RESULT", "RunStep", id, { prevStatus: step.status }, parsed.data);

  return NextResponse.json({ success: true });
}
