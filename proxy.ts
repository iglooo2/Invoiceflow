import { NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localizedPath,
  negotiateLocale,
  shouldSkipLocale,
  splitLocalePath,
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const session =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");

    if (!session) {
      const locale = negotiateLocale(
        request.headers.get("accept-language"),
        request.cookies.get(LOCALE_COOKIE)?.value,
      );
      const login = new URL(localizedPath(locale, "/login"), request.url);
      login.searchParams.set("callbackUrl", pathname);
      return applyLocale(NextResponse.redirect(login), locale);
    }

    return NextResponse.next();
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
