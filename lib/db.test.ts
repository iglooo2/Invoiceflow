import { test } from "node:test";
import assert from "node:assert/strict";
import { NEON_HTTP_ADAPTER_OPTIONS } from "./db";
import { registerFailureMessage, safeErrorLog } from "./db-errors";
import {
  prismaAdapterKind,
  sanitizeNeonHttpUrl,
  stripQueryParams,
} from "./db-url";

test("selects Neon HTTP for neon.tech hosts", () => {
  assert.equal(
    prismaAdapterKind("postgresql://u:p@ep-foo.us-east-1.aws.neon.tech/db?sslmode=require"),
    "neon-http",
  );
});

test("selects pg adapter for generic Postgres", () => {
  assert.equal(prismaAdapterKind("postgresql://u:p@db.supabase.co/postgres"), "pg");
  assert.equal(prismaAdapterKind("postgres://u:p@localhost:5432/app"), "pg");
});

test("uses native client for SQLite so npm run setup stays adapter-free", () => {
  assert.equal(prismaAdapterKind("file:./dev.db"), "native");
  assert.equal(prismaAdapterKind(""), "native");
});

test("Neon HTTP adapter options enable array mode", () => {
  assert.equal(NEON_HTTP_ADAPTER_OPTIONS.arrayMode, true);
  assert.equal(NEON_HTTP_ADAPTER_OPTIONS.fullResults, true);
});

test("strips channel_binding from pooled Neon URLs and keeps sslmode", () => {
  const raw =
    "postgresql://u:p@ep-foo-pooler.us-east-1.aws.neon.tech/db?sslmode=require&channel_binding=require";
  assert.equal(
    sanitizeNeonHttpUrl(raw),
    "postgresql://u:p@ep-foo-pooler.us-east-1.aws.neon.tech/db?sslmode=require",
  );
});

test("strips Prisma/pgbouncer leftovers without touching userinfo", () => {
  const raw = "postgresql://u:p%40ss@host/db?pgbouncer=true&connection_limit=1";
  assert.equal(sanitizeNeonHttpUrl(raw), "postgresql://u:p%40ss@host/db");
  assert.equal(stripQueryParams("postgresql://u:p@h/db", ["sslmode"]), "postgresql://u:p@h/db");
});

test("safeErrorLog redacts connection strings", () => {
  const log = safeErrorLog(
    new Error("connect postgresql://invoice:s3cret@ep-foo.neon.tech/db failed"),
  );
  assert.equal(log.message.includes("s3cret"), false);
  assert.equal(log.message.includes("postgresql://***@"), true);
  assert.equal(log.name, "Error");
});

test("registerFailureMessage names a missing runtime DATABASE_URL", () => {
  const previous = process.env.DATABASE_URL;
  const provider = process.env.PRISMA_PROVIDER;
  delete process.env.DATABASE_URL;
  process.env.PRISMA_PROVIDER = "postgresql";
  try {
    const message = registerFailureMessage(new Error("boom"));
    assert.match(message, /DATABASE_URL is missing at runtime/);
    assert.equal(message.includes("s3cret"), false);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    if (provider === undefined) delete process.env.PRISMA_PROVIDER;
    else process.env.PRISMA_PROVIDER = provider;
  }
});

test("registerFailureMessage maps missing tables and unique conflicts", () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://u:p@ep-foo.neon.tech/db";
  try {
    assert.match(
      registerFailureMessage({ name: "PrismaClientKnownRequestError", code: "P2021", message: "table" }),
      /db:push:prod/,
    );
    assert.match(
      registerFailureMessage({ name: "PrismaClientKnownRequestError", code: "P2002", message: "unique" }),
      /already exists/,
    );
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
