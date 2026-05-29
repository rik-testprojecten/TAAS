import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const flow = await prisma.flow.findFirst({
    where: { id, tenantId },
    include: {
      phase: { include: { project: true } },
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          steps: {
            where: { isArchived: false },
            orderBy: { order: "asc" },
            include: {
              assignees: { include: { user: { select: { id: true, name: true } } } },
              attachments: { select: { id: true, fileName: true, sizeBytes: true } },
            },
          },
          _count: { select: { runs: true } },
        },
      },
    },
  });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(flow);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;
  const body = await req.json();

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  // Verify ownership before any cascade operations
  const flow = await prisma.flow.findFirst({ where: { id, tenantId } });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Afsluiten: verwijder alle open taken gekoppeld aan runs van deze flow
  if (parsed.data.status === "CLOSED") {
    const versions = await prisma.flowVersion.findMany({ where: { flowId: id }, select: { id: true } });
    const versionIds = versions.map((v) => v.id);
    const runs = await prisma.testRun.findMany({ where: { flowVersionId: { in: versionIds } }, select: { id: true } });
    const runIds = runs.map((r) => r.id);
    const runSteps = await prisma.runStep.findMany({ where: { runId: { in: runIds } }, select: { id: true } });
    const runStepIds = runSteps.map((s) => s.id);
    await prisma.task.deleteMany({ where: { runStepId: { in: runStepIds }, status: { not: "DONE" } } });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.scheduledStart !== undefined) data.scheduledStart = parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null;
  if (parsed.data.scheduledEnd !== undefined) data.scheduledEnd = parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : null;

  await prisma.flow.updateMany({ where: { id, tenantId }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const flow = await prisma.flow.findFirst({ where: { id, tenantId } });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const versions = await tx.flowVersion.findMany({ where: { flowId: id }, select: { id: true } });
    const versionIds = versions.map((v) => v.id);

    const runs = await tx.testRun.findMany({ where: { flowVersionId: { in: versionIds } }, select: { id: true } });
    const runIds = runs.map((r) => r.id);

    const runSteps = await tx.runStep.findMany({ where: { runId: { in: runIds } }, select: { id: true } });
    const runStepIds = runSteps.map((s) => s.id);

    const issues = await tx.issue.findMany({ where: { runStepId: { in: runStepIds } }, select: { id: true } });
    const issueIds = issues.map((i) => i.id);

    await tx.task.deleteMany({
      where: { OR: [{ runStepId: { in: runStepIds } }, { issueId: { in: issueIds } }] },
    });
    await tx.issue.deleteMany({ where: { id: { in: issueIds } } });
    await tx.runStepAssignee.deleteMany({ where: { runStepId: { in: runStepIds } } });
    await tx.runStep.deleteMany({ where: { id: { in: runStepIds } } });
    await tx.testRun.deleteMany({ where: { id: { in: runIds } } });
    await tx.flow.deleteMany({ where: { id, tenantId } });
  });

  return NextResponse.json({ success: true });
}
