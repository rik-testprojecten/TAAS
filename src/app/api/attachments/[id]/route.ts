import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const attachment = await prisma.attachment.findFirst({ where: { id, tenantId } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
