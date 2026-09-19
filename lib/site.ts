export const SITE_NAME = "InvoiceFlow";
export const SITE_STUDIO = "InvoiceFlow Studio";
export const SITE_DOMAIN = "invoiceflowstudio.com";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_DESCRIPTION =
  "Ditch the Word docs. Pick a template that matches your work — fast invoices and proposals for designers, editors, and writers.";

export function startFreeHref(signedIn: boolean) {
  return signedIn ? "/dashboard" : "/login?mode=register";
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
