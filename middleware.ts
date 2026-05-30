import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public paths
  if (
    pathname === "/login" ||
    pathname === "/set-password" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/account/set-password"
  ) {
    return NextResponse.next();
  }

  // Require auth for everything else
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Platform admin routes
  if (pathname.startsWith("/admin")) {
    if (session.user.userType !== "platform") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Tenant routes require tenant user
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    if (session.user.userType === "platform") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
