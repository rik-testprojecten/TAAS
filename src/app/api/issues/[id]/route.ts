import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "QUESTION", "RESOLVED", "REJECTED", "WITHDRAWN"]).optional(),
  impact: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  hasWorkaround: z.boolean().optional(),
  workaroundNote: z.string().optional(),
  businessAccepted: z.boolean().optional(),
  businessAcceptNote: z.string().optional(),
  retestRequired: z.boolean().optional(),
  title: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["BUG", "WISH", "BLOCKER"]).optional(),
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
  const { tenantId, user } = result.context;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const issue = await prisma.issue.findFirst({
    where: { id, tenantId },
    include: { runStep: { include: { assignees: true } } },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isWithdrawing = parsed.data.status === "WITHDRAWN" && issue.status !== "WITHDRAWN";
  const isResolvingNow = parsed.data.status === "RESOLVED" && issue.status !== "RESOLVED";
  const isRejectingNow = parsed.data.status === "REJECTED" && issue.status !== "REJECTED";

  const isAdmin = user.roles.includes("TENANT_ADMIN");
  const isFM = user.roles.includes("FUNCTIONAL_MANAGER");
  const isTester = user.roles.includes("TESTER");
  const isOwnIssue = issue.createdById === user.id;

  // Tester kan alleen WITHDRAWN zetten op eigen bevinding
  if (isWithdrawing) {
    if (!((isTester && isOwnIssue) || isAdmin || isFM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Alleen FM/TENANT_ADMIN of de instuurder mag een bevinding bewerken
  if (!isAdmin && !isFM && !isOwnIssue) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const before = { status: issue.status, impact: issue.impact, title: issue.title };
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (isResolvingNow) updateData.retestRequired = true;

  await prisma.issue.update({ where: { id }, data: updateData });

  // Determine audit action
  let action = "UPDATE";
  if (isWithdrawing) action = "WITHDRAW";
  else if (isResolvingNow) action = "RESOLVE";
  else if (parsed.data.status === "REJECTED") action = "REJECT";

  await logAudit(tenantId, user.id, action, "Issue", id, before, parsed.data);

  if (isResolvingNow && issue.runStepId) {
    await prisma.runStep.updateMany({
      where: { id: issue.runStepId, tenantId },
      data: { status: "IN_PROGRESS", doneAt: null },
    });

    await prisma.runStepAssignee.updateMany({
      where: { runStepId: issue.runStepId },
      data: { completedAt: null, completedStatus: null },
    });

    // Hertest taak gaat altijd alleen naar de instuurder van de bevinding
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

  // Bij afwijzing: notificatietaak voor de instuurder
  if (isRejectingNow) {
    await prisma.task.create({
      data: {
        tenantId,
        userId: issue.createdById,
        type: "QUESTION",
        title: `Bevinding afgewezen: ${issue.title}`,
        description: `Jouw bevinding is afgewezen. Bekijk de bevinding voor meer informatie.`,
        issueId: id,
        status: "OPEN",
      },
    });
  }

  return NextResponse.json({ success: true });
}
