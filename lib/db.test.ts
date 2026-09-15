import { test } from "node:test";
import assert from "node:assert/strict";
import { NEON_HTTP_ADAPTER_OPTIONS, prismaAdapterKind } from "./db";

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

test("Neon HTTP adapter options do not disable array mode", () => {
  assert.equal("arrayMode" in NEON_HTTP_ADAPTER_OPTIONS, false);
});
