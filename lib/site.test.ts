import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTACT_EMAIL, CONTACT_PATH, isNeonUrl, isPostgresUrl } from "./site";

test("detects postgres urls", () => {
  assert.equal(isPostgresUrl("postgresql://u:p@host/db"), true);
  assert.equal(isPostgresUrl("postgres://u:p@host/db"), true);
  assert.equal(isPostgresUrl("file:./dev.db"), false);
});

test("detects neon hosts", () => {
  assert.equal(isNeonUrl("postgresql://u:p@ep-foo.us-east-1.aws.neon.tech/db"), true);
  assert.equal(isNeonUrl("postgresql://u:p@db.supabase.co/postgres"), false);
});

test("Message us links to the contact page and never prints the inbox address", () => {
  assert.equal(CONTACT_EMAIL, "galit.igor@yahoo.com");
  assert.equal(CONTACT_PATH, "/contact");

  const footer = readFileSync(path.join(import.meta.dirname, "../components/marketing/shell.tsx"), "utf8");
  assert.match(footer, /\{copy\.messageUs\}/);
  assert.match(footer, /localizedPath\(locale, CONTACT_PATH\)/);
  assert.equal(footer.includes("mailto:"), false);
  assert.equal(footer.includes(CONTACT_EMAIL), false);

  const form = readFileSync(path.join(import.meta.dirname, "../components/marketing/contact-form.tsx"), "utf8");
  assert.equal(form.includes(CONTACT_EMAIL), false);
  assert.equal(form.includes("#050a1f"), false);

  const page = readFileSync(path.join(import.meta.dirname, "../app/[locale]/contact/page.tsx"), "utf8");
  assert.match(page, /MarketingHeader/);
  assert.match(page, /MarketingFooter/);
  assert.equal(page.includes("#050a1f"), false);
});
