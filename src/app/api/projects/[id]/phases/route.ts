import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.enum(["FAT", "GAT", "PAT"]),
  title: z.string().optional(),
  order: z.number().default(0),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const phases = await prisma.testPhase.findMany({
    where: { projectId: id, tenantId },
    include: {
      flows: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { _count: { select: { steps: true, runs: true } } },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(phases);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, tenantId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const phase = await prisma.testPhase.create({
    data: { ...parsed.data, projectId: id, tenantId },
  });
  return NextResponse.json(phase, { status: 201 });
}
