import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  moduleKey: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const flows = await prisma.flow.findMany({
    where: { phaseId: id, tenantId },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { _count: { select: { steps: true, runs: true } } },
      },
    },
  });
  return NextResponse.json(flows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phase = await prisma.testPhase.findFirst({ where: { id, tenantId } });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const flow = await prisma.flow.create({
    data: {
      ...parsed.data,
      phaseId: id,
      tenantId,
      versions: { create: { tenantId, version: "v1.0" } },
    },
    include: { versions: { include: { steps: true } } },
  });
  return NextResponse.json(flow, { status: 201 });
}
