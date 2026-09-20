import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  allowVerifiedOauthAccountLinking,
  googleEmailIsVerified,
  oauthProviderVerifiesEmail,
} from "./auth-oauth";

test("only Google is treated as an email-verifying OAuth provider", () => {
  assert.equal(oauthProviderVerifiesEmail("google"), true);
  assert.equal(oauthProviderVerifiesEmail("apple"), false);
  assert.equal(oauthProviderVerifiesEmail("github"), false);
  assert.equal(oauthProviderVerifiesEmail("credentials"), false);
});

test("Google linking requires a verified email", () => {
  assert.equal(googleEmailIsVerified({ email_verified: true }), true);
  assert.equal(googleEmailIsVerified({ email_verified: "true" }), true);
  assert.equal(googleEmailIsVerified({ email_verified: false }), false);
  assert.equal(googleEmailIsVerified({}), false);
  assert.equal(allowVerifiedOauthAccountLinking("google", { email_verified: true }), true);
  assert.equal(allowVerifiedOauthAccountLinking("google", { email_verified: false }), false);
  assert.equal(allowVerifiedOauthAccountLinking("apple", { email_verified: false }), false);
  assert.equal(allowVerifiedOauthAccountLinking("github", { email_verified: true }), false);
});

test("Auth.js Google provider opts into verified-email account linking", () => {
  const auth = readFileSync(path.join(import.meta.dirname, "auth.ts"), "utf8");
  assert.match(auth, /allowDangerousEmailAccountLinking:\s*true/);
  assert.match(auth, /allowVerifiedOauthAccountLinking/);
  assert.match(auth, /async signIn/);
  assert.doesNotMatch(auth, /GitHub\(\{[\s\S]*allowDangerousEmailAccountLinking/);
});
