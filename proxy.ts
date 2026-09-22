import { NextRequest, NextResponse } from "next/server";
import { hasAuthjsSessionCookie } from "@/lib/auth-cookies";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localizedPath,
  negotiateLocale,
  shouldSkipLocale,
  splitLocalePath,
  type Locale,
} from "@/lib/i18n";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function applyLocale(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

function nextWithLocale(request: NextRequest, locale: string) {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return applyLocale(NextResponse.next({ request: { headers } }), locale);
}

/** Old signup URLs. The account form lives on the localized login page. */
const REGISTER_ALIAS_PATHS = new Set(["/register", "/signup"]);

export function isRegisterAlias(pathname: string) {
  const { path } = splitLocalePath(pathname);
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return REGISTER_ALIAS_PATHS.has(normalized);
}

function redirectToRegister(request: NextRequest, locale: Locale) {
  // Use the standard URL parser. NextURL keeps a trailing slash from the
  // request when the Location header is serialized (`/en/login/?mode=`).
  const url = new URL(request.url);
  url.pathname = localizedPath(locale, "/login");
  url.searchParams.set("mode", "register");
  return applyLocale(NextResponse.redirect(url), locale);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isRegisterAlias(pathname)) {
    const pathLocale = splitLocalePath(pathname).locale;
    const locale =
      pathLocale ??
      negotiateLocale(
        request.headers.get("accept-language"),
        request.cookies.get(LOCALE_COOKIE)?.value,
      );
    return redirectToRegister(request, locale);
  }

  if (pathname.startsWith("/dashboard")) {
    const locale = negotiateLocale(
      request.headers.get("accept-language"),
      request.cookies.get(LOCALE_COOKIE)?.value,
    );
    const session = hasAuthjsSessionCookie((name) => request.cookies.get(name));

    if (!session) {
      const login = new URL(localizedPath(locale, "/login"), request.url);
      login.searchParams.set("callbackUrl", pathname);
      return applyLocale(NextResponse.redirect(login), locale);
    }

    return nextWithLocale(request, locale);
  }

  if (shouldSkipLocale(pathname)) {
    return NextResponse.next();
  }

  const { locale, path } = splitLocalePath(pathname);
  if (locale) {
    return nextWithLocale(request, locale);
  }

  const chosen = negotiateLocale(
    request.headers.get("accept-language"),
    request.cookies.get(LOCALE_COOKIE)?.value,
  );
  const url = request.nextUrl.clone();
  url.pathname = localizedPath(chosen, path || "/");
  return applyLocale(NextResponse.redirect(url), chosen);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
