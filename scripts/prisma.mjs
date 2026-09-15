#!/usr/bin/env node
/**
 * Runs Prisma CLI against SQLite (local) or PostgreSQL (production).
 * Provider is chosen from DATABASE_URL / PRISMA_PROVIDER — see lib/site.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { buildRuntimeSchema } from "./prisma-schema.mjs";

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

const generating = prismaArgs[0] === "generate";
if (postgres && generating && !urlLooksPostgres) {
  // prisma generate reads env("DATABASE_URL") but does not connect. A placeholder
  // lets Cloudflare builds emit the rust-free Postgres client when the real
  // Neon URL is only a *runtime* secret.
  env.DATABASE_URL = "postgresql://prisma:prisma@127.0.0.1:5432/prisma?sslmode=require";
}

const provider = postgres ? "postgresql" : "sqlite";
const source = readFileSync(sourcePath, "utf8");
const runtime = buildRuntimeSchema(source, provider);

writeFileSync(runtimePath, runtime);

const result = spawnSync(
  "npx",
  ["prisma", ...prismaArgs, "--schema", runtimePath],
  { stdio: "inherit", cwd: root, env },
);

process.exit(result.status ?? 1);
