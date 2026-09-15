#!/usr/bin/env node
/**
 * Runs Prisma CLI against SQLite (local) or PostgreSQL (production).
 * Provider is chosen from DATABASE_URL / PRISMA_PROVIDER — see lib/site.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const sourcePath = path.join(root, "prisma/schema.prisma");
const runtimePath = path.join(root, "prisma/schema.runtime.prisma");

const requirePostgres = process.argv.includes("--require-postgres");
const prismaArgs = process.argv.slice(2).filter((arg) => arg !== "--require-postgres");
const mutating =
  prismaArgs[0] === "migrate" || (prismaArgs[0] === "db" && prismaArgs[1] === "push");

const env = { ...process.env };
if (mutating && env.DATABASE_URL_UNPOOLED) {
  env.DATABASE_URL = env.DATABASE_URL_UNPOOLED;
}

const url = env.DATABASE_URL ?? "file:./dev.db";
const explicit = env.PRISMA_PROVIDER?.toLowerCase();
const urlLooksPostgres = /^postgres(ql)?:/i.test(url);

const postgres =
  explicit === "postgresql" ||
  explicit === "postgres" ||
  ((explicit !== "sqlite") &&
    (urlLooksPostgres || env.WORKERS_CI === "1" || env.CF_PAGES === "1"));

if (requirePostgres && !urlLooksPostgres) {
  console.error(
    "This command needs a Postgres DATABASE_URL (postgresql://…). Local SQLite is file:./dev.db.",
  );
  process.exit(1);
}

const provider = postgres ? "postgresql" : "sqlite";
const source = readFileSync(sourcePath, "utf8");
const runtime = source.replace(
  /(datasource db \{[\s\S]*?provider\s*=\s*)"(sqlite|postgresql)"/,
  `$1"${provider}"`,
);

writeFileSync(runtimePath, runtime);

const result = spawnSync(
  "npx",
  ["prisma", ...prismaArgs, "--schema", runtimePath],
  { stdio: "inherit", cwd: root, env },
);

process.exit(result.status ?? 1);
