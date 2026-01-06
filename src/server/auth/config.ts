import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { env } from "~/env"
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";
import { decodeAccountSwitchCookie, getCookieFromHeader, ACCOUNT_SWITCH_COOKIE } from "~/server/accountSwitch";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";


declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    
    } & DefaultSession["user"];
  }
}


export const authConfig = {
  secret: env.AUTH_SECRET,
  

  session: {
    strategy: "jwt" as const,
  },
  
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "account-switch",
      name: "account-switch",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials, request) {
        const userId = credentials?.userId;
        if (typeof userId !== "string" || !userId) {
          return null;
        }

        if (!env.AUTH_SECRET) {
          return null;
        }

        const cookieHeader = request.headers.get("cookie");
        const cookieValue = getCookieFromHeader(cookieHeader, ACCOUNT_SWITCH_COOKIE);
        const accountsFromCookie = decodeAccountSwitchCookie(cookieValue, env.AUTH_SECRET);
        const allowed = accountsFromCookie.some((a) => a.userId === userId);
        if (!allowed) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await argon2.verify(
          user.password,
          credentials.password as string
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Keep these in the token so session.strategy="jwt" can reflect updates.
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }

      // Allow `useSession().update(...)` to refresh token fields (e.g., image) on demand.
      if (trigger === "update") {
        const nextUser = (
          session as
            | { user?: { name?: unknown; email?: unknown; image?: unknown } }
            | undefined
        )?.user;

        if (typeof nextUser?.name === "string") token.name = nextUser.name;
        if (typeof nextUser?.email === "string") token.email = nextUser.email;
        if (typeof nextUser?.image === "string") token.image = nextUser.image;
      }

      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.image === "string") session.user.image = token.image;
      }

      return session;
    },
  },
  
  pages: {
    signIn: "/",
  },
} satisfies NextAuthConfig;