import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

// Monitoring overzicht: alle taken, stappen en voortgang voor een actieve fase
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "FUNCTIONAL_MANAGER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phase = await prisma.testPhase.findFirst({ where: { id, tenantId } });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Haal alle actieve runs in deze fase op
  const runs = await prisma.testRun.findMany({
    where: { phaseId: id, tenantId },
    include: {
      flowVersion: { include: { flow: { select: { id: true, name: true, scheduledStart: true, scheduledEnd: true } } } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignees: {
            include: { user: { select: { id: true, name: true } } },
          },
          tasks: {
            where: { status: { not: "DONE" }, type: "STEP_EXECUTION" },
            include: { user: { select: { id: true, name: true } } },
          },
          _count: { select: { issues: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Haal alle actieve taken in deze fase op (alle testers)
  const runStepIds = runs.flatMap((r) => r.steps.map((s) => s.id));

  const allOpenTasks = await prisma.task.findMany({
    where: {
      tenantId,
      status: { not: "DONE" },
      type: { in: ["STEP_EXECUTION", "RETEST"] },
      runStepId: { in: runStepIds },
    },
    include: {
      user: { select: { id: true, name: true } },
      runStep: {
        include: {
          run: {
            include: {
              flowVersion: { include: { flow: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Haal alle testers in deze tenant op
  const tenantUsers = await prisma.tenantUser.findMany({
    where: { tenantId, isActive: true, roles: { has: "TESTER" } },
    select: { id: true, name: true },
  });

  // Groepeer taken per persoon
  const now = new Date();
  const STALE_HOURS = 48; // taken ouder dan 48 uur zijn "verlopen"

  const tasksByUser = new Map<string, {
    user: { id: string; name: string };
    activeTasks: typeof allOpenTasks;
    staleTasks: typeof allOpenTasks;
  }>();

  for (const task of allOpenTasks) {
    const uid = task.userId;
    if (!tasksByUser.has(uid)) {
      tasksByUser.set(uid, { user: task.user, activeTasks: [], staleTasks: [] });
    }
    const entry = tasksByUser.get(uid)!;
    const ageHours = (now.getTime() - task.createdAt.getTime()) / 1000 / 3600;
    if (ageHours > STALE_HOURS) {
      entry.staleTasks.push(task);
    } else {
      entry.activeTasks.push(task);
    }
  }

  // Aankomende stappen per persoon (PENDING steps met assignees in actieve runs)
  const upcomingByUser = new Map<string, typeof runs[0]["steps"]>();
  for (const run of runs) {
    if (!["IN_PROGRESS", "DRAFT"].includes(run.status)) continue;
    for (const step of run.steps) {
      if (step.status !== "PENDING") continue;
      for (const assignee of step.assignees) {
        if (!upcomingByUser.has(assignee.userId)) {
          upcomingByUser.set(assignee.userId, []);
        }
        upcomingByUser.get(assignee.userId)!.push(step);
      }
    }
  }

  const userOverview = tenantUsers.map((u) => {
    const entry = tasksByUser.get(u.id);
    return {
      user: u,
      activeTasks: entry?.activeTasks ?? [],
      staleTasks: entry?.staleTasks ?? [],
      upcomingStepCount: upcomingByUser.get(u.id)?.length ?? 0,
    };
  }).filter((u) => u.activeTasks.length > 0 || u.staleTasks.length > 0 || u.upcomingStepCount > 0);

  // Stats
  const totalOpen = allOpenTasks.length;
  const totalStale = allOpenTasks.filter((t) => {
    const age = (now.getTime() - t.createdAt.getTime()) / 1000 / 3600;
    return age > STALE_HOURS;
  }).length;
  const totalSteps = runs.flatMap((r) => r.steps).length;
  const doneSteps = runs.flatMap((r) => r.steps).filter((s) => ["PASSED", "FAILED", "BLOCKED"].includes(s.status)).length;

  return NextResponse.json({
    runs,
    userOverview,
    stats: {
      totalOpen,
      totalStale,
      totalSteps,
      doneSteps,
      activeRuns: runs.filter((r) => r.status === "IN_PROGRESS").length,
    },
  });
}
