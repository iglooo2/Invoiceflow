import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { postgresPrismaEnabled } from "./site";
import { prismaAdapterKind, readDatabaseUrl, sanitizeNeonHttpUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/**
 * Prisma's Neon HTTP adapter forces arrayMode + fullResults per query. Setting
 * the same on the neon() client avoids pooled-URL result parsing failures.
 */
export const NEON_HTTP_ADAPTER_OPTIONS = {
  arrayMode: true,
  fullResults: true,
};

export type { PrismaAdapterKind } from "./db-url";
export {
  databaseRuntimeStatus,
  isMissingRuntimeDatabaseUrl,
  prismaAdapterKind,
  readDatabaseUrl,
  sanitizeNeonHttpUrl,
} from "./db-url";

export function createPrismaClient(url = readDatabaseUrl()) {
  const kind = prismaAdapterKind(url);

  if (kind === "neon-http") {
    return new PrismaClient({
      adapter: new PrismaNeonHTTP(sanitizeNeonHttpUrl(url), NEON_HTTP_ADAPTER_OPTIONS),
      log,
    });
  }

  if (kind === "pg") {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
      log,
    });
  }

  if (postgresPrismaEnabled()) {
    throw new Error(
      "DATABASE_URL must be a postgresql:// connection string when PRISMA_PROVIDER=postgresql (Neon HTTP on Cloudflare Workers). The URL was missing at Prisma init — check Worker runtime secrets, not only build variables.",
    );
  }

  return new PrismaClient({ log });
}

function getPrismaClient() {
  const url = readDatabaseUrl();
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === url) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient(url);
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  return client;
}

/**
 * Lazy proxy so the first query runs after OpenNext copies Worker secrets onto
 * `process.env` / Cloudflare request env.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
  has(_target, prop) {
    return Reflect.has(getPrismaClient(), prop);
  },
});
