import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "@/lib/email";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.enum(["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"])).min(1),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: id },
    select: { id: true, name: true, email: true, roles: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.tenantUser.findFirst({
    where: { tenantId, email: { equals: email, mode: "insensitive" } },
  });
  if (existing) return NextResponse.json({ error: "E-mailadres al in gebruik" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.tenantUser.create({
    data: { ...parsed.data, email, password: hashed, tenantId },
    select: { id: true, name: true, email: true, roles: true, isActive: true },
  });
  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAuth();
  if ("error" in result) return result.error;
  const { id: tenantId } = await params;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId vereist" }, { status: 400 });

  await prisma.tenantUser.update({
    where: { id: userId, tenantId },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
