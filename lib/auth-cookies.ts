/** Auth.js JWT session cookie names (HTTP and HTTPS). */
export const AUTHJS_SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * True when an Auth.js session cookie is present. This does not verify the JWT
 * — use `auth()` / `requireUser()` for that. Marketing pages should call this
 * instead of `getCurrentUser()` so public SSR skips bcrypt and Prisma
 * (Cloudflare Error 1102).
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
