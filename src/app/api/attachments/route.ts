import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const MAX_BYTES = 10 * 1024 * 1024;

// Allowlist of accepted upload types (screenshots, documents, spreadsheets, text).
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Strip characters that could break out of the Content-Disposition header.
function sanitizeFileName(name: string): string {
  return name.replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_").slice(0, 200) || "bestand";
}

function decodedByteLength(base64Data: string): number {
  const b64 = base64Data.replace(/^data:[^;]+;base64,/, "");
  // Each base64 char encodes 6 bits; padding accounts for the remainder.
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

async function uploadToBlob(mimeType: string, base64Data: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = await import("@vercel/blob");
    const buffer = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
    // Unguessable path; access is gated by the authenticated GET route below, not the URL.
    const blob = await put(`attachments/${randomUUID()}`, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
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
  if (typeof data !== "string" || decodedByteLength(data) > MAX_BYTES) {
    return NextResponse.json({ error: "Bestand groter dan 10 MB" }, { status: 400 });
  }
  const safeMime = typeof mimeType === "string" ? mimeType : "";
  if (!ALLOWED_MIME.has(safeMime)) {
    return NextResponse.json({ error: "Bestandstype niet toegestaan" }, { status: 415 });
  }

  // Try Vercel Blob first, fall back to base64 in DB
  const blobUrl = await uploadToBlob(safeMime, data);

  const attachment = await prisma.attachment.create({
    data: {
      tenantId,
      fileName: sanitizeFileName(fileName),
      mimeType: safeMime,
      sizeBytes,
      // Store URL in data field when using Blob, otherwise store base64
      data: blobUrl ? `__blob__${blobUrl}` : data,
    },
  });

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    sizeBytes: attachment.sizeBytes,
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

  const safeName = sanitizeFileName(attachment.fileName);
  const headers = {
    "Content-Type": attachment.mimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safeName}"`,
    // Never let the browser sniff/execute uploaded content inline.
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };

  let buffer: Buffer;
  if (attachment.data.startsWith("__blob__")) {
    // Stream the bytes through this authenticated route instead of exposing the
    // public blob URL — tenant scoping is enforced here, not by URL secrecy.
    const url = attachment.data.slice(8);
    const res = await fetch(url);
    if (!res.ok) {
      logger.error({ status: res.status }, "Failed to fetch attachment blob");
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    const base64 = attachment.data.replace(/^data:[^;]+;base64,/, "");
    buffer = Buffer.from(base64, "base64");
  }

  return new NextResponse(new Uint8Array(buffer), { headers });
}
