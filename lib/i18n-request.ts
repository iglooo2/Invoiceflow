import { notFound } from "next/navigation";
import { getDictionary } from "./dictionary";
import { isLocale, type Locale } from "./i18n";

export function resolveLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  return locale;
}

export function marketingCopy(locale: string) {
  const resolved = resolveLocale(locale);
  return { locale: resolved, dict: getDictionary(resolved) };
}
