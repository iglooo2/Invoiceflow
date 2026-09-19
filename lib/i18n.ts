export const LOCALES = ["en", "es", "fr", "de", "pt"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "invoiceflow-locale";
export const LOCALE_HEADER = "x-invoiceflow-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, { short: string; native: string; html: string }> = {
  en: { short: "EN", native: "English", html: "en" },
  es: { short: "ES", native: "Español", html: "es" },
  fr: { short: "FR", native: "Français", html: "fr" },
  de: { short: "DE", native: "Deutsch", html: "de" },
  pt: { short: "PT", native: "Português", html: "pt-BR" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function htmlLang(locale: Locale) {
  return LOCALE_LABELS[locale].html;
}

export function localizedPath(locale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
  const parts = pathname.split("/");
  const maybe = parts[1];
  if (!isLocale(maybe)) return { locale: null, path: pathname || "/" };
  const rest = `/${parts.slice(2).join("/")}`.replace(/\/+$/, "");
  return { locale: maybe, path: rest === "" ? "/" : rest };
}

const SKIP_PREFIXES = ["/_next", "/api", "/dashboard", "/share", "/r"];
const SKIP_EXACT = new Set(["/icon", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export function shouldSkipLocale(pathname: string) {
  if (SKIP_EXACT.has(pathname)) return true;
  if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      const q = qPart === undefined ? 1 : Number(qPart);
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((item) => item.tag)
    .sort((a, b) => b.q - a.q)
    .map((item) => item.tag);
}

export function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  if (isLocale(lower)) return lower;
  const base = lower.split("-")[0];
  if (isLocale(base)) return base;
  return null;
}

export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  cookie?: string | null,
): Locale {
  if (isLocale(cookie)) return cookie;
  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    const matched = matchLocale(tag);
    if (matched) return matched;
  }
  return DEFAULT_LOCALE;
}

export function formatMessage(template: string, vars: Record<string, string | number>) {
  if (typeof template !== "string") return "";
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function localeCookieValue(locale: Locale) {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
