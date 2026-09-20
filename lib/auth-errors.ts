import type { Dictionary } from "./dictionary";

export type LoginErrors = Dictionary["login"]["errors"];

const OAUTH_CODES = new Set([
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCreateAccount",
  "OAuthAccountNotLinked",
  "AccessDenied",
]);

const CREDENTIALS_CODES = new Set(["CredentialsSignin", "credentials"]);

const CONFIG_CODES = new Set(["Configuration", "MissingSecret"]);

const MAGIC_CODES = new Set(["EmailSignin", "Verification"]);

function normalizeAuthErrorCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  const known = [
    ...OAUTH_CODES,
    ...CREDENTIALS_CODES,
    ...CONFIG_CODES,
    ...MAGIC_CODES,
    "Callback",
    "Default",
    "SessionRequired",
  ];
  const match = known.find((item) => item.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

export function isOauthAccountNotLinkedCode(code: string | null | undefined): boolean {
  return normalizeAuthErrorCode(code ?? "") === "OAuthAccountNotLinked";
}

export function isCredentialsAuthCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return CREDENTIALS_CODES.has(normalizeAuthErrorCode(code));
}

/**
 * Auth.js sends failed sign-ins to `pages.error` (`/login`) as `?error=Code`.
 * The login page used to map *every* code — including CredentialsSignin after
 * email/password register — to the Google OAuth secrets message.
 */
export function loginQueryErrorMessage(code: string | null | undefined, errors: LoginErrors): string | null {
  if (!code) return null;
  const key = normalizeAuthErrorCode(code);
  if (!key) return null;
  if (CREDENTIALS_CODES.has(key)) return errors.invalidCredentials;
  if (CONFIG_CODES.has(key)) return errors.configuration;
  if (key === "OAuthAccountNotLinked") return errors.oauthAccountNotLinked;
  if (OAUTH_CODES.has(key)) return errors.oauthFailed;
  if (MAGIC_CODES.has(key)) return errors.magicFailed;
  return errors.signInIncomplete;
}

/** Google OAuth button failures should never look like an email/password problem. */
export function oauthActionErrorMessage(code: string | null | undefined, errors: LoginErrors): string {
  if (code && normalizeAuthErrorCode(code) === "OAuthAccountNotLinked") {
    return errors.oauthAccountNotLinked;
  }
  return errors.oauthFailed;
}

export function credentialsActionErrorMessage(
  code: string | null | undefined,
  errors: LoginErrors,
  kind: "login" | "register",
): string {
  if (CONFIG_CODES.has(normalizeAuthErrorCode(code ?? ""))) return errors.configuration;
  if (kind === "register" && (!code || isCredentialsAuthCode(code))) return errors.signInFailed;
  if (kind === "login" && isCredentialsAuthCode(code)) return errors.invalidCredentials;
  return loginQueryErrorMessage(code, errors) ?? (kind === "register" ? errors.signInFailed : errors.invalidCredentials);
}

/**
 * Next.js `redirect()` errors encode the location in `digest`:
 * `NEXT_REDIRECT;replace;/login?error=CredentialsSignin;303;`
 */
export function errorCodeFromRedirectDigest(digest: string): string | null {
  if (!digest.startsWith("NEXT_REDIRECT")) return null;
  const parts = digest.split(";");
  const destination = parts.slice(2, -2).join(";");
  const fromDestination = errorCodeFromLocation(destination);
  if (fromDestination) return fromDestination;
  return errorCodeFromLocation(digest);
}

function errorCodeFromLocation(value: string): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    decoded = value;
  }
  const match = decoded.match(/[?&]error=([^;&/#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " ")).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function redirectDigestErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("digest" in error)) return null;
  return errorCodeFromRedirectDigest(String((error as { digest?: unknown }).digest ?? ""));
}

export function authErrorType(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("type" in error)) return null;
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" && type.trim() ? type.trim() : null;
}
