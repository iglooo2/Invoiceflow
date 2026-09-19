import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTACT_EMAIL, CONTACT_MAILTO, isNeonUrl, isPostgresUrl } from "./site";

test("detects postgres urls", () => {
  assert.equal(isPostgresUrl("postgresql://u:p@host/db"), true);
  assert.equal(isPostgresUrl("postgres://u:p@host/db"), true);
  assert.equal(isPostgresUrl("file:./dev.db"), false);
});

test("detects neon hosts", () => {
  assert.equal(isNeonUrl("postgresql://u:p@ep-foo.us-east-1.aws.neon.tech/db"), true);
  assert.equal(isNeonUrl("postgresql://u:p@db.supabase.co/postgres"), false);
});

test("contact mailto uses inquiry subject without exposing the address as link text", () => {
  assert.equal(CONTACT_EMAIL, "galit.igor@yahoo.com");
  assert.equal(
    CONTACT_MAILTO,
    "mailto:galit.igor@yahoo.com?subject=InvoiceFlow%20Studio%20inquiry",
  );

  const footer = readFileSync(path.join(import.meta.dirname, "../components/marketing/shell.tsx"), "utf8");
  assert.match(footer, />Message us</);
  assert.match(footer, /href=\{CONTACT_MAILTO\}/);
  assert.equal(footer.includes(CONTACT_EMAIL), false);
});
