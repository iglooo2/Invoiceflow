import type { Provider } from "next-auth/providers";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { safeErrorLog } from "@/lib/db-errors";
import { sendMagicLinkEmail } from "@/lib/email";
import { markNewUserOnboarding } from "@/lib/onboarding";
import { appleAuthEnabled, githubAuthEnabled, googleAuthEnabled, resendEnabled } from "@/lib/utils";

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      } catch (error) {
        console.error("credentials authorize failed", safeErrorLog(error), databaseRuntimeStatus());
        throw error;
      }
    },
  }),
];

if (googleAuthEnabled()) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (appleAuthEnabled()) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  );
}

if (githubAuthEnabled()) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (resendEnabled()) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "InvoiceFlow Studio <noreply@invoiceflowstudio.com>",
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLinkEmail(identifier, url);
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Required behind Cloudflare (and any reverse proxy). AUTH_URL should still
  // be https://invoiceflowstudio.com in production.
  trustHost: true,
  secret: process.env.AUTH_SECRET || "dev-insecure-secret-change-me",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: markNewUserOnboarding(),
        });
      } catch (error) {
        console.error("createUser onboarding flag failed", safeErrorLog(error), databaseRuntimeStatus());
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
