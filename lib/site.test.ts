import { test } from "node:test";
import assert from "node:assert/strict";
import { isNeonUrl, isPostgresUrl } from "./site";

test("detects postgres urls", () => {
  assert.equal(isPostgresUrl("postgresql://u:p@host/db"), true);
  assert.equal(isPostgresUrl("postgres://u:p@host/db"), true);
  assert.equal(isPostgresUrl("file:./dev.db"), false);
});

test("detects neon hosts", () => {
  assert.equal(isNeonUrl("postgresql://u:p@ep-foo.us-east-1.aws.neon.tech/db"), true);
  assert.equal(isNeonUrl("postgresql://u:p@db.supabase.co/postgres"), false);
});
