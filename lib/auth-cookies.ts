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
