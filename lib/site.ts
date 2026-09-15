export const SITE_NAME = "InvoiceFlow";
export const SITE_STUDIO = "InvoiceFlow Studio";
export const SITE_DOMAIN = "invoiceflowstudio.com";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_DESCRIPTION =
  "Fast, beautiful invoices and proposals for designers, video editors, and writers who hate making them by hand.";

export function isPostgresUrl(url = process.env["DATABASE_URL"] ?? "") {
  return /^postgres(ql)?:/i.test(url.trim());
}

export function isNeonUrl(url = process.env["DATABASE_URL"] ?? "") {
  return /neon\.tech|neon\./i.test(url);
}

export function postgresPrismaEnabled() {
  const explicit = process.env["PRISMA_PROVIDER"]?.toLowerCase();
  if (explicit === "postgresql" || explicit === "postgres") return true;
  if (explicit === "sqlite") return false;
  if (process.env["WORKERS_CI"] === "1" || process.env["CF_PAGES"] === "1") return true;
  return isPostgresUrl();
}
