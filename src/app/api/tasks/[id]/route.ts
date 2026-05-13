import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, tenantId, userId: user.id },
    include: {
      runStep: {
        include: {
          run: {
            include: {
              flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } },
              steps: { orderBy: { order: "asc" }, select: { id: true, order: true } },
            },
          },
          assignees: { include: { user: { select: { id: true, name: true } } } },
          issues: {
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      issue: {
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;
  const body = await req.json();

  await prisma.task.updateMany({
    where: { id, tenantId, userId: user.id },
    data: { status: body.status },
  });
  return NextResponse.json({ success: true });
}
