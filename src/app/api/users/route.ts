import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendInviteMail } from "@/lib/mailer";
import { createInviteToken } from "@/lib/invite-token";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.enum(["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"])),
  sendInvite: z.boolean().optional().default(false),
});

export async function GET() {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER", "FUNCTIONAL_MANAGER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const users = await prisma.tenantUser.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, email: true, roles: true, isActive: true, isBlocked: true, mfaEnabled: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth(["TENANT_ADMIN"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const limited = rateLimit(req, { bucket: "user-create", windowMs: 60_000, max: 20 });
  if (limited) return limited;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.tenantUser.findFirst({ where: { tenantId, email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const { sendInvite, ...userData } = parsed.data;

  const user = await prisma.tenantUser.create({
    data: { ...userData, password: hashed, tenantId },
    select: { id: true, name: true, email: true, roles: true, isActive: true },
  });

  let inviteSent = false;
  if (sendInvite) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId }, select: { orgName: true } });
    // Send a secure set-password link instead of the plaintext password.
    const token = createInviteToken(user.id, user.email);
    inviteSent = await sendInviteMail({
      to: parsed.data.email,
      name: parsed.data.name,
      setPasswordToken: token,
      tenantName: settings?.orgName ?? tenant?.name ?? "TAAS",
    });
  }

  return NextResponse.json({ ...user, inviteSent }, { status: 201 });
}
