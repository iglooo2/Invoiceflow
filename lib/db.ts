import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { isNeonUrl, isPostgresUrl, postgresPrismaEnabled } from "./site";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/**
 * Neon HTTP requires arrayMode + fullResults on each query (the adapter sets
 * those). Passing `arrayMode: false` on the client constructor can make Prisma
 * mis-parse rows. Empty options are the documented Workers/Neon pattern.
 */
export const NEON_HTTP_ADAPTER_OPTIONS = {};

export type PrismaAdapterKind = "neon-http" | "pg" | "native";

export function readDatabaseUrl() {
  // Bracket access so bundlers cannot inline a build-time empty value.
  return process.env["DATABASE_URL"] ?? "";
}

export function prismaAdapterKind(url = readDatabaseUrl()): PrismaAdapterKind {
  if (isPostgresUrl(url)) {
    return isNeonUrl(url) ? "neon-http" : "pg";
  }
  return "native";
}

export function createPrismaClient(url = readDatabaseUrl()) {
  const kind = prismaAdapterKind(url);

  if (kind === "neon-http") {
    return new PrismaClient({
      adapter: new PrismaNeonHTTP(url, NEON_HTTP_ADAPTER_OPTIONS),
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
 * `process.env`. A module-level `new PrismaClient()` runs too early and skips
 * the Neon HTTP adapter, which is what broke production signup.
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
});
