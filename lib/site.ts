import { localizedPath, type Locale } from "./i18n";

export const SITE_NAME = "InvoiceFlow";
export const SITE_STUDIO = "InvoiceFlow Studio";
export const SITE_DOMAIN = "invoiceflowstudio.com";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_DESCRIPTION =
  "Ditch the Word docs. Pick a template that matches your work — fast invoices and proposals for designers, editors, and writers.";
export const CONTACT_EMAIL = "galit.igor@yahoo.com";
export const CONTACT_PATH = "/contact";
export const ADVERTISE_PATH = "/advertise";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("InvoiceFlow Studio inquiry")}`;

export function advertiseContactHref(locale?: Locale) {
  const contact = locale ? localizedPath(locale, CONTACT_PATH) : CONTACT_PATH;
  return `${contact}?topic=partnership`;
}

export function startFreeHref(signedIn: boolean, locale?: Locale) {
  if (signedIn) return "/dashboard";
  const login = locale ? localizedPath(locale, "/login") : "/login";
  return `${login}?mode=register`;
}

export function isPostgresUrl(url = process.env["DATABASE_URL"] ?? "") {
  return /^postgres(ql)?:/i.test(url.trim());
}

export function isNeonUrl(url = process.env["DATABASE_URL"] ?? "") {
  return /neon\.tech|neon\./i.test(url);
}

export function postgresPrismaEnabled() {
  const explicit = process.env.PRISMA_PROVIDER?.toLowerCase();
  if (explicit === "postgresql" || explicit === "postgres") return true;
  if (explicit === "sqlite") return false;
  if (process.env["WORKERS_CI"] === "1" || process.env["CF_PAGES"] === "1") return true;
  return isPostgresUrl();
}
