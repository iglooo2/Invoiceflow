import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import {
  appleAuthEnabled,
  appleClientId,
  appleClientSecret,
  ensureAuthRuntimeEnv,
  githubAuthEnabled,
  googleAuthEnabled,
  googleClientId,
  googleClientSecret,
  readAuthSecret,
  resendEnabled,
  resolvedAuthSecret,
} from "@/lib/auth-env";
import { allowVerifiedOauthAccountLinking } from "@/lib/auth-oauth";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { safeErrorLog } from "@/lib/db-errors";
import { sendMagicLinkEmail } from "@/lib/email";
import { markNewUserOnboarding } from "@/lib/onboarding";

function buildAuthProviders(): Provider[] {
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
        clientId: googleClientId(),
        clientSecret: googleClientSecret(),
        // Safe for Google: it verifies email ownership. Without this, an
        // email/password user hitting Continue with Google gets OAuthAccountNotLinked.
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (appleAuthEnabled()) {
    providers.push(
      Apple({
        clientId: appleClientId(),
        clientSecret: appleClientSecret(),
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (githubAuthEnabled()) {
    providers.push(
      GitHub({
        clientId: readAuthSecret("AUTH_GITHUB_ID"),
        clientSecret: readAuthSecret("AUTH_GITHUB_SECRET"),
      }),
    );
  }

  if (resendEnabled()) {
    providers.push(
      Resend({
        apiKey: readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY"),
        from: readAuthSecret("EMAIL_FROM") || "InvoiceFlow Studio <noreply@invoiceflowstudio.com>",
        sendVerificationRequest: async ({ identifier, url }) => {
          await sendMagicLinkEmail(identifier, url);
        },
      }),
    );
  }

  return providers;
}

async function authOptions(): Promise<NextAuthConfig> {
  await ensureAuthRuntimeEnv();
  const secret = resolvedAuthSecret();
  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    // Required behind Cloudflare (and any reverse proxy). AUTH_URL should still
    // be https://invoiceflowstudio.com in production. AUTH_TRUST_HOST is also
    // written onto process.env so Auth.js internals match this flag.
    trustHost: true,
    // Production must not fall back to a dummy secret: Auth.js then signs JWTs
    // that fail on the next request (`CredentialsSignin`) when AUTH_SECRET is
    // only a Cloudflare *Build* variable.
    secret: secret || (process.env.NODE_ENV === "production" ? undefined : "dev-insecure-secret-change-me"),
    pages: {
      signIn: "/login",
      error: "/login",
    },
    providers: buildAuthProviders(),
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
      async signIn({ account, profile }) {
        if (account?.provider === "google" || account?.provider === "apple") {
          return allowVerifiedOauthAccountLinking(
            account.provider,
            profile as { email_verified?: boolean | string } | undefined,
          );
        }
        return true;
      },
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
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
