import { appleClientSecretReady, type AppleClientSecretInput } from "./apple-secret";
import { readRuntimeSecret } from "./runtime-env";

export function readAuthSecret(name: string) {
  return readRuntimeSecret(name);
}

export function oauthPairEnabled(id: string, secret: string) {
  return Boolean(id.trim() && secret.trim());
}

export function googleAuthEnabled() {
  return oauthPairEnabled(readAuthSecret("AUTH_GOOGLE_ID"), readAuthSecret("AUTH_GOOGLE_SECRET"));
}

export function appleCredentials(): AppleClientSecretInput {
  return {
    clientId: readAuthSecret("AUTH_APPLE_ID"),
    secret: readAuthSecret("AUTH_APPLE_SECRET") || readAuthSecret("AUTH_APPLE_PRIVATE_KEY"),
    teamId: readAuthSecret("AUTH_APPLE_TEAM") || readAuthSecret("AUTH_APPLE_TEAM_ID") || readAuthSecret("APPLE_TEAM_ID"),
    keyId: readAuthSecret("AUTH_APPLE_KEY_ID") || readAuthSecret("APPLE_KEY_ID"),
  };
}

export function appleAuthEnabled() {
  return appleClientSecretReady(appleCredentials());
}

export function githubAuthEnabled() {
  return oauthPairEnabled(readAuthSecret("AUTH_GITHUB_ID"), readAuthSecret("AUTH_GITHUB_SECRET"));
}

export function resendEnabled() {
  return Boolean(readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY"));
}

/**
 * Auth.js still reads AUTH_URL / AUTH_SECRET / AUTH_TRUST_HOST from process.env
 * in some internals. Copy Worker runtime values so OpenNext inlining does not
 * leave them empty during a request.
 */
export function publishAuthRuntimeEnv() {
  const names = [
    "AUTH_SECRET",
    "AUTH_URL",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_APPLE_ID",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
  ];
  for (const name of names) {
    const value = readAuthSecret(name);
    if (value) process.env[name] = value;
  }
  process.env.AUTH_TRUST_HOST = "true";
}
