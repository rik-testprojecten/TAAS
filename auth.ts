import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;

        // Try platform user first
        const platformUser = await prisma.platformUser.findUnique({
          where: { email },
        });
        if (platformUser && platformUser.isActive) {
          const valid = await bcrypt.compare(password, platformUser.password);
          if (valid) {
            return {
              id: platformUser.id,
              name: platformUser.name,
              email: platformUser.email,
              userType: "platform" as const,
              tenantId: null,
              roles: [platformUser.role],
            };
          }
        }

        // Try tenant user
        const tenantUser = await prisma.tenantUser.findFirst({
          where: { email, isActive: true },
          include: { tenant: true },
        });
        if (tenantUser) {
          const valid = await bcrypt.compare(password, tenantUser.password);
          if (valid && tenantUser.tenant.isActive) {
            return {
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              userType: "tenant" as const,
              tenantId: tenantUser.tenantId,
              roles: tenantUser.roles,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as import("@/types").SessionUser & { id: string };
        token.userId = u.id;
        token.userType = u.userType;
        token.tenantId = u.tenantId;
        token.roles = u.roles;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId;
      session.user.userType = token.userType;
      session.user.tenantId = token.tenantId;
      session.user.roles = token.roles;
      return session;
    },
  },
});
