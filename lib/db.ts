import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { isNeonUrl, isPostgresUrl } from "./site";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "";

  if (isPostgresUrl(url)) {
    // Neon HTTP is the Workers-friendly path. Generic Postgres (Supabase, etc.)
    // uses `pg` + nodejs_compat (OpenNext copies pg-cloudflare's empty stub).
    const adapter = isNeonUrl(url)
      ? new PrismaNeonHTTP(url, { fullResults: true, arrayMode: false })
      : new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
