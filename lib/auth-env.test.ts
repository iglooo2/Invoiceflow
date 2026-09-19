import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  appleAuthEnabled,
  githubAuthEnabled,
  googleAuthEnabled,
  oauthPairEnabled,
  readAuthSecret,
  resendEnabled,
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
  assert.match(auth, /readAuthSecret\("AUTH_GOOGLE_ID"\)/);
  assert.match(auth, /readAuthSecret\("AUTH_APPLE_ID"\)/);
  assert.doesNotMatch(auth, /process\.env\.AUTH_GOOGLE_ID/);
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
});
