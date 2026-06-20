import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials, _request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const { prisma } = await import("../db/prisma");
          const bcrypt = await import("bcryptjs");

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          const valid = await bcrypt.compare(password, user.password);

          if (!valid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role as "ADMIN" | "CUSTOMER",
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "ADMIN" | "CUSTOMER" }).role;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: "ADMIN" | "CUSTOMER" }).role =
          token.role as "ADMIN" | "CUSTOMER";
      }

      return session;
    },
  },

  pages: {
    signIn: "/en/auth/login",
    error: "/en/auth/error",
  },

  session: {
    strategy: "jwt",
  },
};