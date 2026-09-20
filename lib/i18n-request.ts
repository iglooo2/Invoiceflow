import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDictionary } from "./dictionary";
import { LOCALE_COOKIE, LOCALE_HEADER, negotiateLocale, isLocale, type Locale } from "./i18n";

export function resolveLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  return locale;
}

export function marketingCopy(locale: string) {
  const resolved = resolveLocale(locale);
  return { locale: resolved, dict: getDictionary(resolved) };
}

export async function getRequestLocale(): Promise<Locale> {
  const headerLocale = (await headers()).get(LOCALE_HEADER);
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return negotiateLocale(null, headerLocale || cookieLocale);
}

export const appCopy = cache(async () => {
  const locale = await getRequestLocale();
  return { locale, dict: getDictionary(locale) };
});
