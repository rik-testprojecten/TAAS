import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(1),
  type: z.enum(["BUG", "WISH", "BLOCKER"]),
  impact: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const issues = await prisma.issue.findMany({
    where: { runStepId: id, tenantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(issues);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const step = await prisma.runStep.findFirst({ where: { id, tenantId } });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const body = await req.json();
  const { attachmentIds, ...rest } = body;
  const parsed = createSchema.safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const issue = await prisma.issue.create({
    data: { ...parsed.data, runStepId: id, tenantId, createdById: user.id },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, tenantId, issueId: null },
      data: { issueId: issue.id },
    });
  }

  await logAudit(tenantId, user.id, "CREATE", "Issue", issue.id, null, parsed.data);

  const fmUsers = await prisma.tenantUser.findMany({
    where: { tenantId, roles: { has: "FUNCTIONAL_MANAGER" }, isActive: true },
  });
  if (fmUsers.length > 0) {
    await prisma.task.createMany({
      data: fmUsers.map((u) => ({
        tenantId,
        userId: u.id,
        type: "QUESTION" as const,
        title: `Nieuwe bevinding: ${parsed.data.title}`,
        description: parsed.data.description,
        issueId: issue.id,
      })),
    });
  }

  return NextResponse.json(issue, { status: 201 });
}
