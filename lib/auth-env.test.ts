import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  appleAuthEnabled,
  applyAuthRuntimeEnv,
  githubAuthEnabled,
  googleAuthEnabled,
  googleClientId,
  googleClientSecret,
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

test("Google and Apple Sign-In read process.env when Cloudflare context is absent", () => {
  const previous = {
    googleId: process.env.AUTH_GOOGLE_ID,
    googleSecret: process.env.AUTH_GOOGLE_SECRET,
    appleId: process.env.AUTH_APPLE_ID,
    appleSecret: process.env.AUTH_APPLE_SECRET,
    githubId: process.env.AUTH_GITHUB_ID,
    githubSecret: process.env.AUTH_GITHUB_SECRET,
    resend: process.env.AUTH_RESEND_KEY,
    resendAlt: process.env.RESEND_API_KEY,
  };
  try {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.AUTH_APPLE_ID;
    delete process.env.AUTH_APPLE_SECRET;
    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;
    delete process.env.AUTH_RESEND_KEY;
    delete process.env.RESEND_API_KEY;
    assert.equal(googleAuthEnabled(), false);
    assert.equal(appleAuthEnabled(), false);
    assert.equal(githubAuthEnabled(), false);
    assert.equal(resendEnabled(), false);
    assert.equal(readAuthSecret("AUTH_GOOGLE_ID"), "");
    assert.equal(readRuntimeSecret("AUTH_GOOGLE_ID"), "");

    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "secret";
    process.env.AUTH_APPLE_ID = "com.invoiceflowstudio.web";
    process.env.AUTH_APPLE_SECRET = "jwt";
    process.env.AUTH_GITHUB_ID = "gh-id";
    process.env.AUTH_GITHUB_SECRET = "gh-secret";
    process.env.AUTH_RESEND_KEY = "re_test";
    assert.equal(googleAuthEnabled(), true);
    assert.equal(appleAuthEnabled(), true);
    assert.equal(githubAuthEnabled(), true);
    assert.equal(resendEnabled(), true);
    assert.equal(readAuthSecret("AUTH_GOOGLE_ID"), "id");
    assert.equal(readRuntimeSecret("AUTH_GOOGLE_SECRET"), "secret");
  } finally {
    restoreEnv("AUTH_GOOGLE_ID", previous.googleId);
    restoreEnv("AUTH_GOOGLE_SECRET", previous.googleSecret);
    restoreEnv("AUTH_APPLE_ID", previous.appleId);
    restoreEnv("AUTH_APPLE_SECRET", previous.appleSecret);
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

test("OAuth enablement reads Cloudflare runtime secrets, not a NEXT_PUBLIC flag", () => {
  const authEnv = readFileSync(path.join(import.meta.dirname, "auth-env.ts"), "utf8");
  const runtime = readFileSync(path.join(import.meta.dirname, "runtime-env.ts"), "utf8");
  const auth = readFileSync(path.join(import.meta.dirname, "auth.ts"), "utf8");
  const utils = readFileSync(path.join(import.meta.dirname, "utils.ts"), "utf8");
  const login = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/page.tsx"), "utf8");
  const forms = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/auth-forms.tsx"), "utf8");
  const actions = readFileSync(path.join(import.meta.dirname, "../app/actions/auth.ts"), "utf8");

  assert.match(runtime, /readCloudflareString/);
  assert.match(runtime, /process\.env\[name\]/);
  assert.match(authEnv, /readRuntimeSecret/);
  assert.match(authEnv, /AUTH_GOOGLE_ID/);
  assert.match(authEnv, /AUTH_APPLE_ID/);
  assert.doesNotMatch(authEnv, /NEXT_PUBLIC_/);
  assert.doesNotMatch(utils, /googleAuthEnabled/);
  assert.doesNotMatch(utils, /AUTH_GOOGLE_ID/);
  assert.match(auth, /NextAuth\(authOptions\)/);
  assert.match(auth, /function authOptions\(\)/);
  assert.match(auth, /function buildAuthProviders\(\)/);
  assert.match(auth, /googleClientId\(\)/);
  assert.match(auth, /googleClientSecret\(\)/);
  assert.match(auth, /applyAuthRuntimeEnv\(\)/);
  assert.match(auth, /trustHost: true/);
  assert.match(auth, /resolvedAuthSecret\(\)/);
  assert.doesNotMatch(auth, /process\.env\.AUTH_GOOGLE_ID/);
  assert.match(authEnv, /GOOGLE_CLIENT_ID/);
  assert.match(authEnv, /AUTH_GOOGLE_ID/);
  assert.match(login, /from "@\/lib\/auth-env"/);
  assert.match(login, /force-dynamic/);
  assert.match(login, /await connection\(\)/);
  assert.match(forms, /data-oauth=\{provider\}/);
  assert.match(forms, /copy\.googleHint/);
  assert.match(forms, /copy\.appleHint/);
  assert.doesNotMatch(forms, /\{googleEnabled \?/);
  assert.doesNotMatch(forms, /\{appleEnabled \?/);
  const googleButtonAt = forms.indexOf('provider="google"');
  const emailFieldAt = forms.indexOf('htmlFor="email"');
  assert.ok(
    googleButtonAt > 0 && googleButtonAt < emailFieldAt,
    "Google/Apple must render above email/password on login and register",
  );
  assert.match(actions, /from "@\/lib\/auth-env"/);
  assert.match(actions, /redirectDigestErrorCode/);
  assert.match(actions, /credentialsActionErrorMessage/);
  assert.match(actions, /oauthActionErrorMessage/);
  assert.match(login, /loginQueryErrorMessage/);
  assert.doesNotMatch(login, /dict\.login\.errors\.oauthFailed/);
});
