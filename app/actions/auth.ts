"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { databaseRuntimeStatus, isMissingRuntimeDatabaseUrl, prisma } from "@/lib/db";
import {
  missingRuntimeDatabaseUrlMessage,
  registerFailureMessage,
  safeErrorLog,
} from "@/lib/db-errors";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function loginWithPassword(formData: FormData) {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: String(formData.get("callbackUrl") || "/dashboard"),
    });
  } catch (error) {
    if (isMissingRuntimeDatabaseUrl()) {
      console.error("loginWithPassword", safeErrorLog(error), databaseRuntimeStatus());
      return { error: missingRuntimeDatabaseUrlMessage() };
    }
    if (error instanceof AuthError) {
      return { error: "Those credentials didn’t match. Try the demo login or create an account." };
    }
    throw error;
  }
}

export async function registerWithPassword(formData: FormData) {
  const parsed = credentialsSchema.extend({ name: z.string().min(1) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: "Name, a valid email, and an 8+ character password are required." };
  }
  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;
  if (isMissingRuntimeDatabaseUrl()) {
    console.error("registerWithPassword missing DATABASE_URL", databaseRuntimeStatus());
    return { error: missingRuntimeDatabaseUrlMessage() };
  }
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(parsed.data.password, 10);
  } catch (error) {
    console.error("registerWithPassword hash failed", safeErrorLog(error));
    return { error: "Couldn’t hash that password on this server. Check Worker logs (bcryptjs / crypto)." };
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "An account with that email already exists. Sign in instead." };
    }
    const now = new Date();
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        passwordHash,
        businessName: name,
        businessEmail: email,
        plan: "free",
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
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }
}

export async function loginWithGithub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function loginWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter the email for your magic link." };
  try {
    await signIn("resend", {
      email,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Couldn’t send a magic link. Check AUTH_RESEND_KEY." };
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
