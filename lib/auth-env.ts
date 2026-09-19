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

export function appleAuthEnabled() {
  return oauthPairEnabled(readAuthSecret("AUTH_APPLE_ID"), readAuthSecret("AUTH_APPLE_SECRET"));
}

export function githubAuthEnabled() {
  return oauthPairEnabled(readAuthSecret("AUTH_GITHUB_ID"), readAuthSecret("AUTH_GITHUB_SECRET"));
}

export function resendEnabled() {
  return Boolean(readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY"));
}
