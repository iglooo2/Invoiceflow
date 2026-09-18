import { isNeonUrl, isPostgresUrl, postgresPrismaEnabled } from "./site";
import { readCloudflareString } from "./runtime-env";

export type PrismaAdapterKind = "neon-http" | "pg" | "native";

const NEON_HTTP_STRIP_PARAMS = [
  "channel_binding",
  "pgbouncer",
  "connection_limit",
  "pool_timeout",
  "connect_timeout",
];

/**
 * Worker secrets live on the Cloudflare env. Next.js may inline an empty
 * `process.env.DATABASE_URL` from the build. Prefer the request env, but keep
 * local SQLite (`file:…`) from `.env` so `npm run setup` / `npm run dev` work.
 */
export function readDatabaseUrl() {
  const fromProcess = (process.env["DATABASE_URL"] ?? "").trim();
  if (fromProcess && !isPostgresUrl(fromProcess)) {
    return fromProcess;
  }
  return readCloudflareString("DATABASE_URL") || fromProcess;
}

export function stripQueryParams(url: string, keys: string[]) {
  let result = url;
  for (const key of keys) {
    result = result.replace(new RegExp(`([?&])${key}=[^&]*`, "gi"), "$1");
  }
  result = result.replace(/[?&]{2,}/g, (match) => (match.includes("?") ? "?" : "&"));
  result = result.replace(/\?&/g, "?");
  result = result.replace(/[?&]$/g, "");
  return result;
}

/** Neon HTTP uses fetch, not SCRAM. `channel_binding=require` on pooled URLs breaks it. Keep sslmode=require. */
export function sanitizeNeonHttpUrl(url: string) {
  const next = stripQueryParams(url.trim(), NEON_HTTP_STRIP_PARAMS);
  if (!isPostgresUrl(next)) return next;
  if (/[?&]sslmode=/i.test(next)) {
    return next.replace(/([?&]sslmode=)[^&]*/i, "$1require");
  }
  return `${next}${next.includes("?") ? "&" : "?"}sslmode=require`;
}

export function prismaAdapterKind(url = readDatabaseUrl()): PrismaAdapterKind {
  if (isPostgresUrl(url)) {
    return isNeonUrl(url) ? "neon-http" : "pg";
  }
  return "native";
}

export function isMissingRuntimeDatabaseUrl() {
  const url = readDatabaseUrl();
  if (!url) return true;
  if (postgresPrismaEnabled() && !isPostgresUrl(url)) return true;
  return false;
}

/** Booleans only — never include the connection string. */
export function databaseRuntimeStatus(rawUrl = readDatabaseUrl()) {
  const sanitized = sanitizeNeonHttpUrl(rawUrl);
  return {
    hasDatabaseUrl: Boolean(rawUrl),
    adapterKind: prismaAdapterKind(rawUrl),
    postgresProvider: postgresPrismaEnabled(),
    isPostgres: isPostgresUrl(rawUrl),
    isNeon: isNeonUrl(rawUrl),
    hasPoolerHost: /-pooler\./i.test(rawUrl),
    hadChannelBinding: /channel_binding=/i.test(rawUrl),
    strippedChannelBinding: /channel_binding=/i.test(rawUrl) && !/channel_binding=/i.test(sanitized),
  };
}
