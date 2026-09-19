import { SITE_URL } from "./site";
import {
  copyCloudflareAuthEnvToProcess,
  ensureCloudflareContext,
  readRuntimeSecret,
} from "./runtime-env";

export const AUTH_SECRET_RUNTIME_MISSING =
  "AUTH_SECRET is missing at Worker runtime. Set it as a Cloudflare Runtime Secret (Settings → Variables and Secrets), not only a Build variable. Also set AUTH_URL=https://invoiceflowstudio.com as a Runtime variable.";

export function readAuthSecret(name: string) {
  return readRuntimeSecret(name);
}

export function firstAuthSecret(...names: string[]) {
  for (const name of names) {
    const value = readAuthSecret(name);
    if (value) return value;
  }
  return "";
}

export function isPlaceholderAuthSecret(value: string) {
  const secret = value.trim();
  return (
    !secret ||
    secret === "replace-with-a-long-random-string" ||
    secret === "dev-insecure-secret-change-me"
  );
}

export function oauthPairEnabled(id: string, secret: string) {
  return Boolean(id.trim() && secret.trim());
}

/**
 * Auth.js v5 documents `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
 * Google Cloud Console and NextAuth v4 use `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
 */
export function googleClientId() {
  return firstAuthSecret("AUTH_GOOGLE_ID", "AUTH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID", "GOOGLE_ID");
}

export function googleClientSecret() {
  return firstAuthSecret(
    "AUTH_GOOGLE_SECRET",
    "AUTH_GOOGLE_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_SECRET",
  );
}

export function appleClientId() {
  return firstAuthSecret("AUTH_APPLE_ID", "APPLE_ID", "APPLE_CLIENT_ID");
}

export function appleClientSecret() {
  return firstAuthSecret("AUTH_APPLE_SECRET", "APPLE_SECRET", "APPLE_CLIENT_SECRET");
}

export function resolvedAuthSecret() {
  for (const name of ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const) {
    const value = readAuthSecret(name);
    if (!isPlaceholderAuthSecret(value)) return value;
  }
  return "";
}

export function resolvedAuthUrl() {
  return (
    firstAuthSecret("AUTH_URL", "NEXTAUTH_URL") ||
    (process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000")
  );
}

export function googleAuthEnabled() {
  return oauthPairEnabled(googleClientId(), googleClientSecret());
}

export function appleAuthEnabled() {
  return oauthPairEnabled(appleClientId(), appleClientSecret());
}

export function githubAuthEnabled() {
  return oauthPairEnabled(readAuthSecret("AUTH_GITHUB_ID"), readAuthSecret("AUTH_GITHUB_SECRET"));
}

export function resendEnabled() {
  return Boolean(readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY"));
}

function writeProcessEnv(name: string, value: string) {
  if (!value) return;
  process.env[name] = value;
}

/**
 * Copy Worker runtime secrets onto `process.env` under the Auth.js names.
 * Auth.js `setEnvDefaults` reads `process.env.AUTH_SECRET` / `AUTH_URL`.
 * Cloudflare Build variables are not on Worker `env` — Runtime secrets are.
 */
export function applyAuthRuntimeEnv() {
  const secret = resolvedAuthSecret();
  writeProcessEnv("AUTH_SECRET", secret);
  writeProcessEnv("NEXTAUTH_SECRET", secret);

  const url = resolvedAuthUrl();
  writeProcessEnv("AUTH_URL", url);
  writeProcessEnv("NEXTAUTH_URL", url);
  writeProcessEnv("AUTH_TRUST_HOST", "true");

  const googleId = googleClientId();
  const googleSecret = googleClientSecret();
  writeProcessEnv("AUTH_GOOGLE_ID", googleId);
  writeProcessEnv("AUTH_GOOGLE_SECRET", googleSecret);

  const appleId = appleClientId();
  const appleSecret = appleClientSecret();
  writeProcessEnv("AUTH_APPLE_ID", appleId);
  writeProcessEnv("AUTH_APPLE_SECRET", appleSecret);
}

export async function ensureAuthRuntimeEnv() {
  await ensureCloudflareContext();
  copyCloudflareAuthEnvToProcess();
  applyAuthRuntimeEnv();
  if (process.env.NODE_ENV === "production" && !resolvedAuthSecret()) {
    console.error(AUTH_SECRET_RUNTIME_MISSING);
  }
}
