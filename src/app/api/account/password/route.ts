import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// Authenticated self-service password change for both platform and tenant users.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(req, { bucket: "password-change", windowMs: 60_000, max: 5 });
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;
  const userId = session.user.id;

  if (session.user.userType === "platform") {
    const u = await prisma.platformUser.findUnique({ where: { id: userId } });
    if (!u || !(await bcrypt.compare(currentPassword, u.password))) {
      return NextResponse.json({ error: "Huidig wachtwoord onjuist" }, { status: 403 });
    }
    await prisma.platformUser.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return NextResponse.json({ success: true });
  }

  const u = await prisma.tenantUser.findUnique({ where: { id: userId } });
  if (!u || !(await bcrypt.compare(currentPassword, u.password))) {
    return NextResponse.json({ error: "Huidig wachtwoord onjuist" }, { status: 403 });
  }
  await prisma.tenantUser.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  if (session.user.tenantId) {
    await logAudit(session.user.tenantId, userId, "PASSWORD_CHANGE", "TenantUser", userId, null, null);
  }
  return NextResponse.json({ success: true });
}
