import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

// GDPR Art. 15/20 — machine-readable export of a user's personal data and the
// records they authored. Accessible to the user themselves or a tenant admin.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  if (user.id !== id && !user.roles.includes("TENANT_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = rateLimit(req, { bucket: "data-export", windowMs: 60_000, max: 5 });
  if (limited) return limited;

  const target = await prisma.tenantUser.findFirst({
    where: { id, tenantId },
    select: { id: true, name: true, email: true, roles: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!target) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const [tasks, issuesCreated, issueComments, auditLogs] = await Promise.all([
    prisma.task.findMany({ where: { tenantId, userId: id } }),
    prisma.issue.findMany({ where: { tenantId, createdById: id } }),
    prisma.issueComment.findMany({ where: { tenantId, userId: id } }),
    prisma.auditLog.findMany({ where: { tenantId, userId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    subject: target,
    contributions: { tasks, issuesCreated, issueComments, auditLogs },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gebruiker-${id}-export.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
