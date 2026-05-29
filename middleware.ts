import { auth } from "./auth";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const authMiddleware = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
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

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  try {
    return await authMiddleware(req, event);
  } catch {
    const { pathname } = req.nextUrl;
    if (pathname === "/login" || pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
