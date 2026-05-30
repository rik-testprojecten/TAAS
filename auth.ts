import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/prisma";
import { verifyToken } from "./src/lib/totp";
import { getTenantLoginCandidates } from "./src/lib/login-queries";

const useSecureCookies = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // refresh the token at most once per hour
  },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
        // accountId pint de gekozen klant (tenantUser.id) of "platform".
        accountId: { label: "Account", type: "text" },
        // totp: 6-cijferige code voor klanten met verplichte 2FA.
        totp: { label: "Code", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;
        const accountId = (credentials.accountId as string | undefined) || undefined;
        const totp = (credentials.totp as string | undefined) || undefined;

        // ─── Platform-gebruiker ───────────────────────────────────────────
        // Alleen proberen als er geen specifieke klant is gekozen, of het
        // platform-account expliciet is geselecteerd.
        if (!accountId || accountId === "platform") {
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
          // Expliciet platform gekozen maar ongeldig → geen fallback.
          if (accountId === "platform") return null;
        }

        // ─── Klant-gebruiker (tenant) ─────────────────────────────────────
        // Resilient lookup: reconcilieert ontbrekende kolommen en valt zo nodig
        // terug op een degraded query (zie src/lib/login-queries.ts).
        const candidates = await getTenantLoginCandidates(email);
        // Wanneer een account is gekozen pinnen we exact die TenantUser.
        const pool = accountId ? candidates.filter((c) => c.id === accountId) : candidates;

        const matched: typeof pool = [];
        for (const c of pool) {
          if (c.isBlocked || !c.tenantActive) continue; // isActive is al gefilterd
          const valid = await bcrypt.compare(password, c.password);
          if (valid) matched.push(c);
        }

        // Zonder expliciete keuze en met meerdere mogelijke klanten weigeren
        // we — de gebruiker moet eerst een klant selecteren.
        if (!accountId && matched.length !== 1) return null;
        const tenantUser = matched[0];
        if (!tenantUser) return null;

        // ─── Verplichte 2FA afdwingen ─────────────────────────────────────
        if (tenantUser.mfaRequired) {
          // Geen geldige koppeling → inloggen geblokkeerd tot na de
          // koppelstap (zie /api/auth/mfa/*).
          if (!tenantUser.mfaEnabled || !tenantUser.mfaSecret) return null;
          if (!totp || !verifyToken(tenantUser.mfaSecret, totp)) return null;
        }

        return {
          id: tenantUser.id,
          name: tenantUser.name,
          email,
          userType: "tenant" as const,
          tenantId: tenantUser.tenantId,
          roles: tenantUser.roles,
        };
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
      session.user.id = token.userId as string;
      session.user.userType = token.userType as "platform" | "tenant";
      session.user.tenantId = token.tenantId as string | null;
      session.user.roles = token.roles as string[];
      return session;
    },
  },
});
