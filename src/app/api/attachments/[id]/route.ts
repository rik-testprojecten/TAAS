import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;
  const { id } = await params;

  const attachment = await prisma.attachment.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      data: true,
      mimeType: true,
      fileName: true,
      flowStepId: true,
      runStepId: true,
      issueId: true,
      runStep: { select: { assignees: { select: { userId: true } } } },
      issue: { select: { createdById: true } },
    },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = user.roles.includes("TENANT_ADMIN");
  const isFM = user.roles.includes("FUNCTIONAL_MANAGER");

  if (attachment.runStepId) {
    // Run-stap bijlage (bewijs/screenshots): alleen de geassigneerde testers + admin/FM
    const isAssigned = attachment.runStep!.assignees.some((a) => a.userId === user.id);
    if (!isAdmin && !isFM && !isAssigned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (attachment.issueId) {
    // Bevindingsbijlage: alleen de instuurder + admin/FM
    const isCreator = attachment.issue!.createdById === user.id;
    if (!isAdmin && !isFM && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // FlowStep-bijlagen en losse (nog niet gekoppelde) bijlagen zijn vrij voor alle tenant-gebruikers

  const buffer = Buffer.from(attachment.data, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  await prisma.attachment.deleteMany({ where: { id, tenantId } });
  return NextResponse.json({ success: true });
}
