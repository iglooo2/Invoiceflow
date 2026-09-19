import { test } from "node:test";
import assert from "node:assert/strict";
import { appleFormPostCookies, shouldUseSecureAuthCookies } from "./auth-cookies";

test("Apple form_post cookies are SameSite=None only on HTTPS", () => {
  assert.equal(appleFormPostCookies(false), undefined);
  const cookies = appleFormPostCookies(true);
  assert.equal(cookies?.state?.name, "__Secure-authjs.state");
  assert.equal(cookies?.nonce?.name, "__Secure-authjs.nonce");
  assert.equal(cookies?.pkceCodeVerifier?.name, "__Secure-authjs.pkce.code_verifier");
  assert.equal(cookies?.state?.options.sameSite, "none");
  assert.equal(cookies?.state?.options.secure, true);
  assert.equal(cookies?.nonce?.options.sameSite, "none");
  assert.equal(cookies?.callbackUrl?.options.sameSite, "none");
});

test("shouldUseSecureAuthCookies follows the request or AUTH_URL", () => {
  assert.equal(shouldUseSecureAuthCookies("https://invoiceflowstudio.com/api/auth/signin/apple"), true);
  assert.equal(shouldUseSecureAuthCookies("http://localhost:3000", "https://invoiceflowstudio.com"), true);
  assert.equal(shouldUseSecureAuthCookies("http://localhost:3000", "http://localhost:3000"), false);
  assert.equal(shouldUseSecureAuthCookies(undefined, undefined), false);
});
