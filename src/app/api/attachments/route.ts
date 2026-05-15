import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const MAX_BYTES = 10 * 1024 * 1024;

async function uploadToBlob(fileName: string, mimeType: string, base64Data: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = await import("@vercel/blob");
    const buffer = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
    const blob = await put(`attachments/${Date.now()}-${fileName}`, buffer, {
      access: "public",
      contentType: mimeType,
    });
    return blob.url;
  } catch (err) {
    logger.error(err, "Vercel Blob upload failed, falling back to base64");
    return null;
  }
}

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const { fileName, mimeType, sizeBytes, data } = await req.json();

  if (!fileName || !data || typeof sizeBytes !== "number" || sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "Ongeldig bestand of groter dan 10 MB" }, { status: 400 });
  }

  // Try Vercel Blob first, fall back to base64 in DB
  const blobUrl = await uploadToBlob(fileName, mimeType ?? "application/octet-stream", data);

  const attachment = await prisma.attachment.create({
    data: {
      tenantId,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes,
      // Store URL in data field when using Blob, otherwise store base64
      data: blobUrl ? `__blob__${blobUrl}` : data,
    },
  });

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    sizeBytes: attachment.sizeBytes,
    url: blobUrl ?? undefined,
  });
}

export async function GET(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const attachmentId = req.nextUrl.searchParams.get("id");
  if (!attachmentId) return NextResponse.json({ error: "id vereist" }, { status: 400 });

  const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, tenantId } });
  if (!attachment) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // If stored as Blob URL, redirect
  if (attachment.data.startsWith("__blob__")) {
    const url = attachment.data.slice(8);
    return NextResponse.redirect(url);
  }

  // Legacy base64 — stream as download
  const base64 = attachment.data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
    },
  });
}
