import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAuthjsSessionCookie } from "./auth-cookies";

test("hasAuthjsSessionCookie detects Auth.js session cookies without verifying the JWT", () => {
  const jar: Record<string, string> = { "authjs.session-token": "jwt" };
  assert.equal(hasAuthjsSessionCookie((name) => jar[name]), true);
  assert.equal(
    hasAuthjsSessionCookie((name) => (name === "__Secure-authjs.session-token" ? { value: "jwt" } : undefined)),
    true,
  );
  assert.equal(hasAuthjsSessionCookie(() => undefined), false);
});
