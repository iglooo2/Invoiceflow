import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localizedPath } from "@/lib/i18n";
import { isReferralCode, REFERRAL_COOKIE } from "@/lib/referrals";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const jar = await cookies();
  const localeCookie = jar.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const register = `${localizedPath(locale, "/login")}?mode=register`;
  if (!isReferralCode(code)) {
    return NextResponse.redirect(new URL(register, request.url));
  }
  const response = NextResponse.redirect(
    new URL(`${register}&ref=${encodeURIComponent(code)}`, request.url),
  );
  response.cookies.set(REFERRAL_COOKIE, code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
  });
  return response;
}
