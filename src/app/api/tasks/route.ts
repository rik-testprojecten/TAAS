import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET() {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;

  const tasks = await prisma.task.findMany({
    where: { tenantId, userId: user.id, status: { not: "DONE" } },
    include: {
      runStep: { include: { run: { include: { flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } } } } } },
      issue: { select: { id: true, title: true, type: true, impact: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Bevinding 10: bepaal vanuit welke gebruiker de vorige stap komt (herkomst van de taak)
  const runIds = Array.from(new Set(tasks.map((t) => t.runStep?.runId).filter(Boolean))) as string[];
  if (runIds.length === 0) return NextResponse.json(tasks);

  const allSteps = await prisma.runStep.findMany({
    where: { runId: { in: runIds }, tenantId },
    select: { id: true, runId: true, order: true, parentRunStepId: true, doneById: true, title: true },
  });
  const stepById = new Map(allSteps.map((s) => [s.id, s]));

  // Primaire stappen per run, gesorteerd op order (voor de "vorige stap" bij niet-thread stappen)
  const primaryByRun = new Map<string, typeof allSteps>();
  for (const s of allSteps) {
    if (s.parentRunStepId) continue;
    if (!primaryByRun.has(s.runId)) primaryByRun.set(s.runId, []);
    primaryByRun.get(s.runId)!.push(s);
  }
  for (const arr of primaryByRun.values()) arr.sort((a, b) => a.order - b.order);

  const doneByIds = new Set<string>();
  const predecessorByTask = new Map<string, { doneById: string | null; title: string } | null>();
  for (const t of tasks) {
    if (t.type !== "STEP_EXECUTION" || !t.runStep) {
      predecessorByTask.set(t.id, null);
      continue;
    }
    const step = t.runStep;
    let predecessor: { doneById: string | null; title: string } | null = null;
    if (step.parentRunStepId) {
      // Thread-stap: de vorige stap is de parent in de keten
      const parent = stepById.get(step.parentRunStepId);
      if (parent) predecessor = { doneById: parent.doneById, title: parent.title };
    } else {
      // Primaire stap: de vorige primaire stap met een lager order
      const primaries = primaryByRun.get(step.runId) ?? [];
      const prev = [...primaries].reverse().find((s) => s.order < step.order);
      if (prev) predecessor = { doneById: prev.doneById, title: prev.title };
    }
    if (predecessor?.doneById) doneByIds.add(predecessor.doneById);
    predecessorByTask.set(t.id, predecessor);
  }

  const users = doneByIds.size > 0
    ? await prisma.tenantUser.findMany({ where: { id: { in: Array.from(doneByIds) }, tenantId }, select: { id: true, name: true } })
    : [];
  const userName = new Map(users.map((u) => [u.id, u.name]));

  const enriched = tasks.map((t) => {
    const pred = predecessorByTask.get(t.id);
    if (pred && pred.doneById) {
      return { ...t, previousStep: { byName: userName.get(pred.doneById) ?? null, title: pred.title } };
    }
    return t;
  });

  return NextResponse.json(enriched);
}
