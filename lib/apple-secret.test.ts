import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APPLE_CLIENT_SECRET_MAX_AGE_SEC,
  appleClientSecretReady,
  looksLikeApplePrivateKey,
  looksLikeJwt,
  normalizeApplePrivateKey,
  resetAppleClientSecretCache,
  resolveAppleClientSecret,
  signAppleClientSecretJwt,
} from "./apple-secret";

const DUMMY_APPLE_JWT =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZWFtIn0.dGVzdA";

test("looksLikeJwt requires a three-part token with an alg header", () => {
  assert.equal(looksLikeJwt(""), false);
  assert.equal(looksLikeJwt("jwt"), false);
  assert.equal(looksLikeJwt(DUMMY_APPLE_JWT), true);
});

test("appleClientSecretReady accepts a JWT or a .p8 key with team and key id", () => {
  assert.equal(
    appleClientSecretReady({ clientId: "com.invoiceflowstudio.web", secret: DUMMY_APPLE_JWT }),
    true,
  );
  assert.equal(appleClientSecretReady({ clientId: "com.invoiceflowstudio.web", secret: "jwt" }), false);
  const pem = "-----BEGIN PRIVATE KEY-----\n" + "A".repeat(80) + "\n-----END PRIVATE KEY-----";
  assert.equal(
    appleClientSecretReady({
      clientId: "com.invoiceflowstudio.web",
      secret: pem,
      teamId: "TEAM12ABCD",
      keyId: "KEY12ABCDE",
    }),
    true,
  );
  assert.equal(
    appleClientSecretReady({
      clientId: "com.invoiceflowstudio.web",
      secret: pem,
    }),
    false,
  );
});

test("normalizeApplePrivateKey rewrites escaped newlines and wraps the body", () => {
  const body = "A".repeat(70);
  const raw = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`;
  const pem = normalizeApplePrivateKey(raw);
  assert.match(pem, /-----BEGIN PRIVATE KEY-----/);
  assert.match(pem, /\n[A]{64}\n/);
  assert.match(pem, /-----END PRIVATE KEY-----/);
});

test("resolveAppleClientSecret returns a JWT as-is and mints one from a P-256 key", async () => {
  assert.equal(
    await resolveAppleClientSecret({
      clientId: "com.invoiceflowstudio.web",
      secret: DUMMY_APPLE_JWT,
    }),
    DUMMY_APPLE_JWT,
  );

  const { pem, publicKey } = await generateTestAppleKey();
  const jwt = await resolveAppleClientSecret({
    clientId: "com.invoiceflowstudio.web",
    secret: pem,
    teamId: "TEAM12ABCD",
    keyId: "KEY12ABCDE",
  });
  const parts = jwt.split(".");
  assert.equal(parts.length, 3);
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  assert.equal(header.alg, "ES256");
  assert.equal(header.kid, "KEY12ABCDE");
  assert.equal(payload.iss, "TEAM12ABCD");
  assert.equal(payload.sub, "com.invoiceflowstudio.web");
  assert.equal(payload.aud, "https://appleid.apple.com");
  assert.equal(payload.exp - payload.iat, APPLE_CLIENT_SECRET_MAX_AGE_SEC);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    Buffer.from(parts[2], "base64url"),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  assert.equal(ok, true);
});

test("resolveAppleClientSecret reuses a minted JWT instead of signing every call", async () => {
  resetAppleClientSecretCache();
  const { pem } = await generateTestAppleKey();
  const input = {
    clientId: "com.invoiceflowstudio.web",
    secret: pem,
    teamId: "TEAM12ABCD",
    keyId: "KEY12ABCDE",
  };
  const first = await resolveAppleClientSecret(input);
  const second = await resolveAppleClientSecret(input);
  assert.equal(first, second);
  resetAppleClientSecretCache();
  const third = await resolveAppleClientSecret(input);
  assert.notEqual(third, first);
});

test("resolveAppleClientSecret rejects an expired JWT and a .p8 without team/key id", async () => {
  const expired = [
    Buffer.from(JSON.stringify({ alg: "ES256" })).toString("base64url"),
    Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url"),
    "sig",
  ].join(".");
  await assert.rejects(
    () => resolveAppleClientSecret({ clientId: "com.invoiceflowstudio.web", secret: expired }),
    /expired/,
  );
  await assert.rejects(
    () =>
      resolveAppleClientSecret({
        clientId: "com.invoiceflowstudio.web",
        secret: "-----BEGIN PRIVATE KEY-----\nABCD\n-----END PRIVATE KEY-----",
      }),
    /AUTH_APPLE_TEAM/,
  );
});

test("signAppleClientSecretJwt is the ES256 JWT Auth.js posts to Apple", async () => {
  const { pem } = await generateTestAppleKey();
  const jwt = await signAppleClientSecretJwt({
    clientId: "com.invoiceflowstudio.web",
    teamId: "TEAM12ABCD",
    keyId: "KEY12ABCDE",
    privateKey: pem.replace(/\n/g, "\\n"),
    now: 1_700_000_000,
  });
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
  assert.equal(payload.iat, 1_700_000_000);
  assert.equal(looksLikeApplePrivateKey(pem), true);
});

async function generateTestAppleKey() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const body = Buffer.from(pkcs8).toString("base64");
  const pem = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;
  return { pem, publicKey: pair.publicKey };
}
