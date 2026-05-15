import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phaseType: z.enum(["FAT", "GAT", "PAT"]).optional(),
  items: z.array(z.object({ label: z.string().min(1) })).min(1),
});

export async function GET(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const phaseType = req.nextUrl.searchParams.get("phaseType");

  const checklists = await prisma.phaseChecklist.findMany({
    where: {
      tenantId,
      ...(phaseType ? { OR: [{ phaseType: phaseType as "FAT" | "GAT" | "PAT" }, { phaseType: null }] } : {}),
    },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checklists);
}

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const checklist = await prisma.phaseChecklist.create({
    data: {
      tenantId,
      name: parsed.data.name,
      phaseType: parsed.data.phaseType ?? null,
      items: {
        create: parsed.data.items.map((item, i) => ({ label: item.label, order: i + 1 })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(checklist, { status: 201 });
}
