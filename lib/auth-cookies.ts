import type { NextAuthConfig } from "next-auth";

const FIFTEEN_MINUTES = 60 * 15;

type CookieOptions = NonNullable<NonNullable<NextAuthConfig["cookies"]>["state"]>;

/**
 * Apple's authorization response is a cross-site `form_post` (POST from
 * appleid.apple.com). Chrome does not send `SameSite=Lax` cookies on that
 * POST, so Auth.js cannot read `state` / `nonce` and the callback fails.
 * Google uses a GET redirect, so Lax cookies work there.
 *
 * `SameSite=None` requires `Secure`, so this is HTTPS-only (Apple already
 * rejects localhost HTTP).
 */
export function appleFormPostCookies(useSecureCookies: boolean): NextAuthConfig["cookies"] {
  if (!useSecureCookies) return undefined;
  const prefix = "__Secure-";
  const options: CookieOptions["options"] = {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    secure: true,
    maxAge: FIFTEEN_MINUTES,
  };
  return {
    pkceCodeVerifier: {
      name: `${prefix}authjs.pkce.code_verifier`,
      options,
    },
    state: {
      name: `${prefix}authjs.state`,
      options,
    },
    nonce: {
      name: `${prefix}authjs.nonce`,
      options: { ...options },
    },
    callbackUrl: {
      name: `${prefix}authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  };
}

export function shouldUseSecureAuthCookies(requestUrl?: string | null, authUrl?: string | null) {
  if (requestUrl?.startsWith("https:")) return true;
  if (authUrl?.startsWith("https://")) return true;
  return false;
}

/** Auth.js JWT session cookie names (HTTP and HTTPS). */
export const AUTHJS_SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * True when an Auth.js session cookie is present. This does not verify the JWT
 * — use `auth()` / `requireUser()` for that. Marketing pages should call this
 * instead of `getCurrentUser()` so public SSR skips Apple JWT minting, bcrypt,
 * and Prisma (Cloudflare Error 1102).
 */
export function hasAuthjsSessionCookie(
  getCookie: (name: string) => { value?: string } | string | undefined | null,
) {
  return AUTHJS_SESSION_COOKIE_NAMES.some((name) => {
    const cookie = getCookie(name);
    const value = typeof cookie === "string" ? cookie : cookie?.value;
    return Boolean(value);
  });
}
