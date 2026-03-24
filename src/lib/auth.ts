import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import {
  verifyPassword,
  isBcryptHash,
  hashPassword,
} from "@/lib/security";
import { UserRole } from "@/types";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours - typical working day
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.active) return null;

        const passwordMatch = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!passwordMatch) return null;

        // Transparently upgrade legacy SHA256 passwords to bcrypt on first login
        if (!isBcryptHash(user.password)) {
          const newHash = await hashPassword(credentials.password);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: newHash },
          });
        }

        // Append audit log
        await prisma.auditLog.create({
          data: {
            user: email,
            action: "Login",
            details: "User logged in",
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          trainerName: user.trainerName,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.trainerName = user.trainerName;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.trainerName = token.trainerName;
      }
      return session;
    },
  },
};
