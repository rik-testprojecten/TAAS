import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const { fileName, mimeType, sizeBytes, data } = await req.json();

  if (!fileName || !data || typeof sizeBytes !== "number" || sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "Ongeldig bestand of groter dan 10 MB" }, { status: 400 });
  }

  const attachment = await prisma.attachment.create({
    data: {
      tenantId,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes,
      data,
    },
  });

  return NextResponse.json({ id: attachment.id, fileName: attachment.fileName, sizeBytes: attachment.sizeBytes });
}
