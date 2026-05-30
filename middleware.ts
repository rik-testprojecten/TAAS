import { auth } from "./auth";
import { NextResponse, type NextRequest } from "next/server";

// Paden die zonder sessie bereikbaar moeten zijn (login + uitnodigings-/
// wachtwoord-flow). Ook gebruikt als veilige fallback wanneer auth() faalt.
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/set-password" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/account/set-password"
  );
}

const authMiddleware = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (session.user.userType !== "platform") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    if (session.user.userType === "platform") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export default async function middleware(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await authMiddleware(req, {} as any);
  } catch {
    const { pathname } = req.nextUrl;
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
