"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import {
  authErrorType,
  credentialsActionErrorMessage,
  oauthActionErrorMessage,
  redirectDigestErrorCode,
} from "@/lib/auth-errors";
import { databaseRuntimeStatus, isMissingRuntimeDatabaseUrl, prisma } from "@/lib/db";
import {
  missingRuntimeDatabaseUrlMessage,
  registerFailureMessage,
  safeErrorLog,
} from "@/lib/db-errors";
import { localizedPath } from "@/lib/i18n";
import { appCopy } from "@/lib/i18n-request";
import { resolveAppleClientSecret } from "@/lib/apple-secret";
import { appleAuthEnabled, appleCredentials, ensureAuthRuntimeEnv, googleAuthEnabled } from "@/lib/auth-env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginWithPassword(formData: FormData) {
  await ensureAuthRuntimeEnv();
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const { dict } = await appCopy();
    return { error: dict.login.errors.invalidEmailPassword };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: String(formData.get("callbackUrl") || "/dashboard"),
    });
  } catch (error) {
    const { dict } = await appCopy();
    const redirectCode = redirectDigestErrorCode(error);
    if (redirectCode) {
      return { error: credentialsActionErrorMessage(redirectCode, dict.login.errors, "login") };
    }
    unstable_rethrow(error);
    if (isMissingRuntimeDatabaseUrl()) {
      console.error("loginWithPassword", safeErrorLog(error), databaseRuntimeStatus());
      return { error: missingRuntimeDatabaseUrlMessage() };
    }
    if (error instanceof AuthError) {
      return { error: credentialsActionErrorMessage(authErrorType(error), dict.login.errors, "login") };
    }
    throw error;
  }
}

export async function registerWithPassword(formData: FormData) {
  await ensureAuthRuntimeEnv();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const { dict } = await appCopy();
    return { error: dict.login.errors.registerRequired };
  }
  const email = parsed.data.email.toLowerCase();
  if (isMissingRuntimeDatabaseUrl()) {
    console.error("registerWithPassword missing DATABASE_URL", databaseRuntimeStatus());
    return { error: missingRuntimeDatabaseUrlMessage() };
  }
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(parsed.data.password, 10);
  } catch (error) {
    console.error("registerWithPassword hash failed", safeErrorLog(error));
    const { dict } = await appCopy();
    return { error: dict.login.errors.hashFailed };
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const { dict } = await appCopy();
      return { error: dict.login.errors.accountExists };
    }
    const now = new Date();
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        businessEmail: email,
        plan: "free",
        onboardingComplete: false,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error("registerWithPassword failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: registerFailureMessage(error) };
  }
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const { dict } = await appCopy();
    const redirectCode = redirectDigestErrorCode(error);
    if (redirectCode) {
      return { error: credentialsActionErrorMessage(redirectCode, dict.login.errors, "register") };
    }
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return { error: credentialsActionErrorMessage(authErrorType(error), dict.login.errors, "register") };
    }
    console.error("registerWithPassword signIn failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: dict.login.errors.signInFailed };
  }
}

export async function loginWithGithub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function loginWithGoogle() {
  await ensureAuthRuntimeEnv();
  const { dict } = await appCopy();
  if (!googleAuthEnabled()) {
    return { error: dict.login.errors.oauthNotConfigured };
  }
  try {
    await signIn("google", { redirectTo: "/dashboard" });
  } catch (error) {
    const redirectCode = redirectDigestErrorCode(error);
    if (redirectCode) {
      return { error: oauthActionErrorMessage(redirectCode, dict.login.errors) };
    }
    unstable_rethrow(error);
    console.error("loginWithGoogle", safeErrorLog(error));
    if (error instanceof AuthError) {
      return { error: oauthActionErrorMessage(authErrorType(error), dict.login.errors) };
    }
    return { error: dict.login.errors.oauthFailed };
  }
}

export async function loginWithApple() {
  await ensureAuthRuntimeEnv();
  const { dict } = await appCopy();
  if (!appleAuthEnabled()) {
    return { error: dict.login.errors.oauthNotConfigured };
  }
  try {
    await resolveAppleClientSecret(appleCredentials());
  } catch (error) {
    console.error("loginWithApple secret", safeErrorLog(error));
    return { error: dict.login.errors.appleSecretInvalid };
  }
  try {
    await signIn("apple", { redirectTo: "/dashboard" });
  } catch (error) {
    const redirectCode = redirectDigestErrorCode(error);
    if (redirectCode) {
      return { error: oauthActionErrorMessage(redirectCode, dict.login.errors) };
    }
    unstable_rethrow(error);
    console.error("loginWithApple", safeErrorLog(error));
    if (error instanceof AuthError) {
      return { error: oauthActionErrorMessage(authErrorType(error), dict.login.errors) };
    }
    return { error: dict.login.errors.oauthFailed };
  }
}

export async function loginWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) {
    const { dict } = await appCopy();
    return { error: dict.login.errors.magicEmail };
  }
  try {
    await signIn("resend", {
      email,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const { dict } = await appCopy();
    const redirectCode = redirectDigestErrorCode(error);
    if (redirectCode) {
      return { error: dict.login.errors.magicFailed };
    }
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return { error: dict.login.errors.magicFailed };
    }
    throw error;
  }
}

export async function logout() {
  const { locale } = await appCopy();
  await signOut({ redirectTo: localizedPath(locale, "/") });
}
