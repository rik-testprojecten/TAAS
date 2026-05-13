import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.enum(["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"])),
});

export async function GET() {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const users = await prisma.tenantUser.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, email: true, roles: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.tenantUser.findFirst({ where: { tenantId, email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.tenantUser.create({
    data: { ...parsed.data, password: hashed, tenantId },
    select: { id: true, name: true, email: true, roles: true, isActive: true },
  });
  return NextResponse.json(user, { status: 201 });
}
