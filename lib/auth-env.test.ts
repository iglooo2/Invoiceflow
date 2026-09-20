import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AUTH_SECRET_RUNTIME_MISSING,
  applyAuthRuntimeEnv,
  githubAuthEnabled,
  googleAuthEnabled,
  googleClientId,
  googleClientSecret,
  isPlaceholderAuthSecret,
  oauthPairEnabled,
  readAuthSecret,
  resendEnabled,
  resolvedAuthSecret,
  resolvedAuthUrl,
} from "./auth-env";
import { readRuntimeSecret } from "./runtime-env";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("oauthPairEnabled requires both a non-empty id and secret", () => {
  assert.equal(oauthPairEnabled("", "secret"), false);
  assert.equal(oauthPairEnabled("id", ""), false);
  assert.equal(oauthPairEnabled("  ", "secret"), false);
  assert.equal(oauthPairEnabled("id", "secret"), true);
});

test("Google Sign-In reads process.env when Cloudflare context is absent", () => {
  const previous = {
    googleId: process.env.AUTH_GOOGLE_ID,
    googleSecret: process.env.AUTH_GOOGLE_SECRET,
    githubId: process.env.AUTH_GITHUB_ID,
    githubSecret: process.env.AUTH_GITHUB_SECRET,
    resend: process.env.AUTH_RESEND_KEY,
    resendAlt: process.env.RESEND_API_KEY,
  };
  try {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;
    delete process.env.AUTH_RESEND_KEY;
    delete process.env.RESEND_API_KEY;
    assert.equal(googleAuthEnabled(), false);
    assert.equal(githubAuthEnabled(), false);
    assert.equal(resendEnabled(), false);
    assert.equal(readAuthSecret("AUTH_GOOGLE_ID"), "");
    assert.equal(readRuntimeSecret("AUTH_GOOGLE_ID"), "");

    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "secret";
    process.env.AUTH_GITHUB_ID = "gh-id";
    process.env.AUTH_GITHUB_SECRET = "gh-secret";
    process.env.AUTH_RESEND_KEY = "re_test";
    assert.equal(googleAuthEnabled(), true);
    assert.equal(githubAuthEnabled(), true);
    assert.equal(resendEnabled(), true);
    assert.equal(readAuthSecret("AUTH_GOOGLE_ID"), "id");
    assert.equal(readRuntimeSecret("AUTH_GOOGLE_SECRET"), "secret");
  } finally {
    restoreEnv("AUTH_GOOGLE_ID", previous.googleId);
    restoreEnv("AUTH_GOOGLE_SECRET", previous.googleSecret);
    restoreEnv("AUTH_GITHUB_ID", previous.githubId);
    restoreEnv("AUTH_GITHUB_SECRET", previous.githubSecret);
    restoreEnv("AUTH_RESEND_KEY", previous.resend);
    restoreEnv("RESEND_API_KEY", previous.resendAlt);
  }
});

test("Google Sign-In accepts GOOGLE_CLIENT_ID as an Auth.js alias", () => {
  const previous = {
    authId: process.env.AUTH_GOOGLE_ID,
    authSecret: process.env.AUTH_GOOGLE_SECRET,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authSecretRoot: process.env.AUTH_SECRET,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    authUrl: process.env.AUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    trustHost: process.env.AUTH_TRUST_HOST,
  };
  try {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    assert.equal(googleAuthEnabled(), false);

    process.env.GOOGLE_CLIENT_ID = "google-cloud-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-cloud-client-secret";
    assert.equal(googleClientId(), "google-cloud-client-id");
    assert.equal(googleClientSecret(), "google-cloud-client-secret");
    assert.equal(googleAuthEnabled(), true);

    process.env.AUTH_GOOGLE_ID = "authjs-id";
    process.env.AUTH_GOOGLE_SECRET = "authjs-secret";
    assert.equal(googleClientId(), "authjs-id", "AUTH_GOOGLE_ID wins over GOOGLE_CLIENT_ID");
    assert.equal(googleAuthEnabled(), true);

    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_URL;
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    process.env.NEXTAUTH_URL = "https://invoiceflowstudio.com";
    assert.equal(resolvedAuthSecret(), "legacy-secret");
    assert.equal(resolvedAuthUrl(), "https://invoiceflowstudio.com");

    applyAuthRuntimeEnv();
    assert.equal(process.env.AUTH_SECRET, "legacy-secret");
    assert.equal(process.env.AUTH_URL, "https://invoiceflowstudio.com");
    assert.equal(process.env.AUTH_TRUST_HOST, "true");
    assert.equal(process.env.AUTH_GOOGLE_ID, "authjs-id");
  } finally {
    restoreEnv("AUTH_GOOGLE_ID", previous.authId);
    restoreEnv("AUTH_GOOGLE_SECRET", previous.authSecret);
    restoreEnv("GOOGLE_CLIENT_ID", previous.clientId);
    restoreEnv("GOOGLE_CLIENT_SECRET", previous.clientSecret);
    restoreEnv("AUTH_SECRET", previous.authSecretRoot);
    restoreEnv("NEXTAUTH_SECRET", previous.nextAuthSecret);
    restoreEnv("AUTH_URL", previous.authUrl);
    restoreEnv("NEXTAUTH_URL", previous.nextAuthUrl);
    restoreEnv("AUTH_TRUST_HOST", previous.trustHost);
  }
});

test("placeholder AUTH_SECRET values are treated as missing", () => {
  assert.equal(isPlaceholderAuthSecret(""), true);
  assert.equal(isPlaceholderAuthSecret("replace-with-a-long-random-string"), true);
  assert.equal(isPlaceholderAuthSecret("dev-insecure-secret-change-me"), true);
  assert.equal(isPlaceholderAuthSecret("a-real-secret-value"), false);

  const previous = process.env.AUTH_SECRET;
  const previousNext = process.env.NEXTAUTH_SECRET;
  try {
    process.env.AUTH_SECRET = "replace-with-a-long-random-string";
    delete process.env.NEXTAUTH_SECRET;
    assert.equal(resolvedAuthSecret(), "");
    process.env.AUTH_SECRET = "runtime-secret-from-worker";
    assert.equal(resolvedAuthSecret(), "runtime-secret-from-worker");
  } finally {
    restoreEnv("AUTH_SECRET", previous);
    restoreEnv("NEXTAUTH_SECRET", previousNext);
  }
});

test("missing AUTH_SECRET message tells operators to use Worker Runtime, not Build", () => {
  assert.match(AUTH_SECRET_RUNTIME_MISSING, /Runtime Secret/);
  assert.match(AUTH_SECRET_RUNTIME_MISSING, /Build variable/);
  assert.match(AUTH_SECRET_RUNTIME_MISSING, /AUTH_URL/);
});

test("OAuth enablement reads Cloudflare runtime secrets, not a NEXT_PUBLIC flag", () => {
  const authEnv = readFileSync(path.join(import.meta.dirname, "auth-env.ts"), "utf8");
  const runtime = readFileSync(path.join(import.meta.dirname, "runtime-env.ts"), "utf8");
  const auth = readFileSync(path.join(import.meta.dirname, "auth.ts"), "utf8");
  const utils = readFileSync(path.join(import.meta.dirname, "utils.ts"), "utf8");
  const login = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/page.tsx"), "utf8");
  const forms = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/auth-forms.tsx"), "utf8");
  const actions = readFileSync(path.join(import.meta.dirname, "../app/actions/auth.ts"), "utf8");

  assert.match(runtime, /readCloudflareString/);
  assert.match(runtime, /getCloudflareContext\(\{ async: true \}\)/);
  assert.match(runtime, /copyCloudflareAuthEnvToProcess/);
  assert.match(runtime, /process\.env\[name\]/);
  assert.match(authEnv, /readRuntimeSecret/);
  assert.match(authEnv, /copyCloudflareAuthEnvToProcess/);
  assert.match(authEnv, /AUTH_GOOGLE_ID/);
  assert.doesNotMatch(authEnv, /AUTH_APPLE/);
  assert.doesNotMatch(authEnv, /appleClientSecretReady/);
  assert.doesNotMatch(authEnv, /NEXT_PUBLIC_/);
  assert.doesNotMatch(utils, /googleAuthEnabled/);
  assert.doesNotMatch(utils, /AUTH_GOOGLE_ID/);
  assert.match(auth, /NextAuth\(authOptions\)/);
  assert.match(auth, /async function authOptions/);
  assert.match(auth, /async function buildAuthProviders/);
  assert.match(auth, /googleClientId\(\)/);
  assert.match(auth, /googleClientSecret\(\)/);
  assert.match(auth, /ensureAuthRuntimeEnv\(\)/);
  assert.match(auth, /allowDangerousEmailAccountLinking/);
  assert.match(auth, /trustHost: true/);
  assert.match(auth, /resolvedAuthSecret\(\)/);
  assert.match(auth, /NODE_ENV === "production" \? undefined/);
  assert.doesNotMatch(auth, /secret: process\.env\.AUTH_SECRET/);
  assert.doesNotMatch(auth, /appleCredentials/);
  assert.doesNotMatch(auth, /resolveAppleClientSecret/);
  assert.doesNotMatch(auth, /appleTokenExchangeRequest/);
  assert.doesNotMatch(auth, /SESSION_ONLY_APPLE_JWT/);
  assert.doesNotMatch(auth, /response_mode: "form_post"/);
  assert.doesNotMatch(auth, /appleFormPostCookies/);
  assert.doesNotMatch(auth, /next-auth\/providers\/apple/);
  assert.match(auth, /await import\("bcryptjs"\)/);
  assert.doesNotMatch(auth, /import bcrypt from "bcryptjs"/);
  assert.doesNotMatch(auth, /process\.env\.AUTH_GOOGLE_ID/);
  assert.match(authEnv, /GOOGLE_CLIENT_ID/);
  assert.match(authEnv, /AUTH_GOOGLE_ID/);
  assert.match(authEnv, /ensureCloudflareContext/);
  assert.match(runtime, /getCloudflareContext\(\{ async: true \}\)/);
  assert.match(login, /hasSessionCookie/);
  assert.match(login, /getCurrentUser/);
  assert.doesNotMatch(login, /appleAuthEnabled/);
  assert.match(login, /force-dynamic/);
  assert.match(login, /await connection\(\)/);
  assert.match(forms, /data-oauth=\{provider\}/);
  assert.match(forms, /copy\.googleHint/);
  assert.doesNotMatch(forms, /copy\.appleHint/);
  assert.doesNotMatch(forms, /loginWithApple/);
  assert.doesNotMatch(forms, /\{googleEnabled \?/);
  assert.doesNotMatch(forms, /appleEnabled/);
  const googleButtonAt = forms.indexOf('provider="google"');
  const emailFieldAt = forms.indexOf('htmlFor="email"');
  assert.ok(
    googleButtonAt > 0 && googleButtonAt < emailFieldAt,
    "Google must render above email/password on login and register",
  );
  assert.match(actions, /from "@\/lib\/auth-env"/);
  assert.match(actions, /ensureAuthRuntimeEnv/);
  assert.match(actions, /redirectDigestErrorCode/);
  assert.match(actions, /credentialsActionErrorMessage/);
  assert.match(actions, /oauthActionErrorMessage/);
  assert.doesNotMatch(actions, /resolveAppleClientSecret/);
  assert.doesNotMatch(actions, /appleSecretInvalid/);
  assert.doesNotMatch(actions, /loginWithApple/);
  assert.match(login, /loginQueryErrorMessage/);
  assert.match(login, /ensureAuthRuntimeEnv/);
  assert.match(login, /isOauthAccountNotLinkedCode/);
  assert.doesNotMatch(login, /dict\.login\.errors\.oauthFailed/);
  const route = readFileSync(path.join(import.meta.dirname, "../app/api/auth/[...nextauth]/route.ts"), "utf8");
  assert.match(route, /ensureAuthRuntimeEnv/);
  assert.match(route, /force-dynamic/);
});
