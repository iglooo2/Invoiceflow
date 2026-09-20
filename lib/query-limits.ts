/**
 * Caps for dashboard SSR queries. Unbounded Prisma `findMany` plus nested
 * includes inflate OpenNext RSC payloads and trip Cloudflare Error 1102.
 */
export const DASHBOARD_LIST_TAKE = 100;

/** Clients / invoices / estimates loaded into Jobs (and similar) pickers. */
export const DOCUMENT_PICKER_TAKE = 80;
