/**
 * Apple Sign-In client-secret handling for Auth.js on Cloudflare Workers.
 *
 * Apple does not issue a static OAuth client secret. The token endpoint expects
 * an ES256 JWT signed with a .p8 key (Team ID as `iss`, Services ID as `sub`).
 * A pre-minted JWT in AUTH_APPLE_SECRET still works until it expires (~6 months).
 * Prefer storing the .p8 key plus AUTH_APPLE_TEAM / AUTH_APPLE_KEY_ID so the
 * Worker can mint a fresh JWT with Web Crypto (no Node `crypto` / jsonwebtoken).
 */

/** Apple's documented maximum JWT lifetime, in seconds (~6 months). */
export const APPLE_CLIENT_SECRET_MAX_AGE_SEC = 15_777_000;

export type AppleClientSecretInput = {
  clientId: string;
  secret: string;
  teamId?: string;
  keyId?: string;
};

export function looksLikeJwt(value: string) {
  const parts = value.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return false;
  try {
    const header = decodeJsonObject(parts[0]);
    return typeof header.alg === "string";
  } catch {
    return false;
  }
}

export function looksLikeApplePrivateKey(value: string) {
  const normalized = value.replace(/\\n/g, "\n");
  if (/-----BEGIN (EC )?PRIVATE KEY-----/.test(normalized)) return true;
  const compact = normalized.replace(/\s+/g, "");
  return compact.length >= 80 && /^[A-Za-z0-9+/=]+$/.test(compact) && !looksLikeJwt(value);
}

export function appleClientSecretReady(input: AppleClientSecretInput) {
  const clientId = input.clientId.trim();
  const secret = input.secret.trim();
  if (!clientId || !secret) return false;
  if (looksLikeJwt(secret)) return true;
  const teamId = input.teamId?.trim() ?? "";
  const keyId = input.keyId?.trim() ?? "";
  return Boolean(teamId && keyId && looksLikeApplePrivateKey(secret));
}

export function normalizeApplePrivateKey(raw: string) {
  let pem = raw.trim().replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
  const wrapped = pem.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (wrapped) {
    const label = wrapped[1];
    const body = wrapped[2].replace(/\s+/g, "");
    return `-----BEGIN ${label}-----\n${wrap64(body)}\n-----END ${label}-----`;
  }
  const body = pem.replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${wrap64(body)}\n-----END PRIVATE KEY-----`;
}

/**
 * Auth.js calls `authOptions()` (and therefore `resolveAppleClientSecret`) on
 * every `auth()` — homepage, dashboard layout, PDF, etc. ECDSA minting on each
 * request is a Cloudflare Error 1102 CPU trap. Reuse a minted JWT for most of
 * its Apple-allowed lifetime; isolates recycle long before that.
 */
const APPLE_JWT_CACHE_REFRESH_SEC = 60 * 60 * 24;

type CachedAppleJwt = { key: string; token: string; exp: number };
let cachedAppleJwt: CachedAppleJwt | null = null;

function appleJwtCacheKey(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}) {
  const key = input.privateKey;
  return `${input.clientId}|${input.teamId}|${input.keyId}|${key.length}|${key.slice(0, 24)}|${key.slice(-24)}`;
}

export function resetAppleClientSecretCache() {
  cachedAppleJwt = null;
}

/** Fresh minted JWT if this isolate already signed one; otherwise null. */
export function cachedAppleClientSecret(): string | null {
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedAppleJwt &&
    cachedAppleJwt.exp - APPLE_JWT_CACHE_REFRESH_SEC > now
  ) {
    return cachedAppleJwt.token;
  }
  return null;
}

/**
 * Apple's token endpoint is the only Auth.js step that needs the ES256 client
 * secret. Session reads (`auth()` on dashboard, PDF, etc.) must not mint.
 */
export function appleTokenExchangeRequest(requestUrl?: string | null) {
  if (!requestUrl) return false;
  const path = requestUrl.split("?")[0] ?? "";
  return path.includes("/api/auth/callback/apple") || path.includes("/api/auth/signin/apple");
}

export async function resolveAppleClientSecret(input: AppleClientSecretInput) {
  const clientId = input.clientId.trim();
  const secret = input.secret.trim();
  if (!clientId) throw new Error("AUTH_APPLE_ID is missing.");
  if (!secret) throw new Error("AUTH_APPLE_SECRET is missing.");
  if (looksLikeJwt(secret)) {
    if (jwtExpired(secret)) {
      throw new Error(
        "AUTH_APPLE_SECRET JWT is expired. Store the .p8 key with AUTH_APPLE_TEAM and AUTH_APPLE_KEY_ID, or mint a new JWT.",
      );
    }
    return secret;
  }
  const teamId = input.teamId?.trim() ?? "";
  const keyId = input.keyId?.trim() ?? "";
  if (!teamId || !keyId) {
    throw new Error(
      "When AUTH_APPLE_SECRET is a .p8 key, set AUTH_APPLE_TEAM and AUTH_APPLE_KEY_ID so the Worker can mint the client-secret JWT.",
    );
  }
  const cacheKey = appleJwtCacheKey({ clientId, teamId, keyId, privateKey: secret });
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedAppleJwt &&
    cachedAppleJwt.key === cacheKey &&
    cachedAppleJwt.exp - APPLE_JWT_CACHE_REFRESH_SEC > now
  ) {
    return cachedAppleJwt.token;
  }
  const token = await signAppleClientSecretJwt({
    clientId,
    teamId,
    keyId,
    privateKey: secret,
  });
  const payload = decodeJsonObject(token.split(".")[1] ?? "");
  const exp = typeof payload.exp === "number" ? payload.exp : now + APPLE_CLIENT_SECRET_MAX_AGE_SEC;
  cachedAppleJwt = { key: cacheKey, token, exp };
  return token;
}

export async function signAppleClientSecretJwt({
  clientId,
  teamId,
  keyId,
  privateKey,
  now = Math.floor(Date.now() / 1000),
}: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  now?: number;
}) {
  const key = await importPkcs8EcP256(privateKey);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + APPLE_CLIENT_SECRET_MAX_AGE_SEC,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };
  const signingInput = `${base64UrlEncodeUtf8(JSON.stringify(header))}.${base64UrlEncodeUtf8(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function jwtExpired(value: string) {
  try {
    const payload = decodeJsonObject(value.trim().split(".")[1] ?? "");
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

function decodeJsonObject(base64Url: string): Record<string, unknown> {
  const json = new TextDecoder().decode(base64UrlToBytes(base64Url));
  const value = JSON.parse(json) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("not a JSON object");
  }
  return value as Record<string, unknown>;
}

function wrap64(value: string) {
  return value.match(/.{1,64}/g)?.join("\n") ?? value;
}

async function importPkcs8EcP256(raw: string) {
  const pem = normalizeApplePrivateKey(raw);
  const body = pem.replace(/-----BEGIN [A-Z ]+-----/g, "").replace(/-----END [A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = base64ToBytes(body);
  return crypto.subtle.importKey(
    "pkcs8",
    copyArrayBuffer(der),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function base64UrlEncodeUtf8(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return base64ToBytes(padded + pad);
}

function base64ToBytes(value: string) {
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(value, "base64"));
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
