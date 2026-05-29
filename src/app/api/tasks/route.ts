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
  return NextResponse.json(tasks);
}
