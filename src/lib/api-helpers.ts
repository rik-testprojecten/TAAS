import { auth } from "../../auth";
import { NextResponse } from "next/server";
import type { SessionUser } from "@/types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type ApiContext = {
  user: SessionUser;
  tenantId: string;
};

export async function requireTenantAuth(
  allowedRoles?: string[]
): Promise<{ context: ApiContext } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    logger.warn("Unauthorized request — no session");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.userType !== "tenant" || !session.user.tenantId) {
    logger.warn({ userId: session.user.id, userType: session.user.userType }, "Forbidden — wrong user type");
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  // Controleer dat het account nog actief, niet-geblokkeerd en aan deze klant
  // gekoppeld is. Hiermee werken blokkeren/verwijderen direct door, ook voor
  // reeds bestaande sessies, en blijft kruis-klant-toegang uitgesloten.
  const account = await prisma.tenantUser.findFirst({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    select: { isActive: true, isBlocked: true },
  });
  if (!account || !account.isActive || account.isBlocked) {
    logger.warn({ userId: session.user.id, tenantId: session.user.tenantId }, "Forbidden — account inactive, blocked or mismatched");
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => session.user.roles.includes(r));
    if (!hasRole) {
      logger.warn({ userId: session.user.id, roles: session.user.roles, required: allowedRoles }, "Forbidden — missing role");
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }
  return {
    context: {
      user: session.user as SessionUser,
      tenantId: session.user.tenantId,
    },
  };
}

export async function requirePlatformAuth(
  allowedRoles?: string[]
): Promise<{ context: { user: SessionUser } } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.userType !== "platform") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => session.user.roles.includes(r));
    if (!hasRole) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }
  return { context: { user: session.user as SessionUser } };
}

export function tenantFilter(tenantId: string) {
  return { tenantId };
}

// Consistent response helpers
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function notFound(message = "Niet gevonden") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message = "Ongeldige aanvraag") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = "Interne serverfout", err?: unknown) {
  if (err) logger.error(err, message);
  return NextResponse.json({ error: message }, { status: 500 });
}
