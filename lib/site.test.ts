import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADVERTISE_PATH, advertiseContactHref, CONTACT_EMAIL, CONTACT_PATH, INDUSTRIES_PATH, isNeonUrl, isPostgresUrl, PRODUCTS_PATH, TEMPLATES_PATH, startFreeHref } from "./site";
import { INDUSTRY_SLUGS } from "./industries";
import { RESOURCE_SLUGS } from "./resources";
import { PRODUCT_COLUMNS, REWARDS_LINK, productHref } from "./products";

test("detects postgres urls", () => {
  assert.equal(isPostgresUrl("postgresql://u:p@host/db"), true);
  assert.equal(isPostgresUrl("postgres://u:p@host/db"), true);
  assert.equal(isPostgresUrl("file:./dev.db"), false);
});

test("detects neon hosts", () => {
  assert.equal(isNeonUrl("postgresql://u:p@ep-foo.us-east-1.aws.neon.tech/db"), true);
  assert.equal(isNeonUrl("postgresql://u:p@db.supabase.co/postgres"), false);
});

test("routes the marketing CTA to signup or the dashboard", () => {
  assert.equal(startFreeHref(false), "/login?mode=register");
  assert.equal(startFreeHref(false, "es"), "/es/login?mode=register");
  assert.equal(startFreeHref(true), "/dashboard");
  assert.equal(startFreeHref(true, "fr"), "/dashboard");
});

test("Message us links to the contact page and never prints the inbox address", () => {
  assert.equal(CONTACT_EMAIL, "galit.igor@yahoo.com");
  assert.equal(CONTACT_PATH, "/contact");
  assert.equal(ADVERTISE_PATH, "/advertise");
  assert.equal(PRODUCTS_PATH, "/products");
  assert.equal(INDUSTRIES_PATH, "/industries");
  assert.equal(INDUSTRY_SLUGS.length, 10);
  assert.equal(TEMPLATES_PATH, "/templates");
  assert.deepEqual(RESOURCE_SLUGS, ["workshop", "calculators", "estimate-templates", "invoice-templates"]);
  assert.equal(advertiseContactHref("en"), "/en/contact?topic=partnership");
  assert.equal(advertiseContactHref(), "/contact?topic=partnership");

  const footer = readFileSync(path.join(import.meta.dirname, "../components/marketing/shell.tsx"), "utf8");
  assert.match(footer, /\{copy\.messageUs\}/);
  assert.match(footer, /localizedPath\(locale, CONTACT_PATH\)/);
  assert.match(footer, /localizedPath\(locale, ADVERTISE_PATH\)/);
  assert.match(footer, /localizedPath\(locale, PRODUCTS_PATH\)/);
  assert.match(footer, /copy\.products/);
  assert.match(footer, /localizedPath\(locale, INDUSTRIES_PATH\)/);
  assert.match(footer, /copy\.industries/);
  assert.match(footer, /IndustriesMenu/);
  assert.match(footer, /IndustriesMobile/);
  assert.match(footer, /ResourcesMenu/);
  assert.match(footer, /ResourcesMobile/);
  assert.match(footer, /localizedPath\(locale, TEMPLATES_PATH\)/);
  assert.equal(footer.includes("#templates"), false);
  assert.match(footer, /PartnerSlot/);
  assert.equal(footer.includes("mailto:"), false);
  assert.equal(footer.includes(CONTACT_EMAIL), false);

  const form = readFileSync(path.join(import.meta.dirname, "../components/marketing/contact-form.tsx"), "utf8");
  assert.equal(form.includes(CONTACT_EMAIL), false);
  assert.equal(form.includes("#050a1f"), false);
  assert.match(form, /defaultTopic/);
  assert.match(form, /CONTACT_API_PATH/);
  assert.doesNotMatch(form, /submitContactRequest/);

  const page = readFileSync(path.join(import.meta.dirname, "../app/[locale]/contact/page.tsx"), "utf8");
  assert.match(page, /MarketingHeader/);
  assert.match(page, /MarketingFooter/);
  assert.match(page, /defaultTopic/);
  assert.equal(page.includes("#050a1f"), false);
});

test("products grid links live routes and leaves unbuilt items unlinked", () => {
  assert.equal(PRODUCT_COLUMNS.length, 4);
  assert.equal(productHref(PRODUCT_COLUMNS[0].items[0], true, "en"), "/dashboard/jobs");
  assert.equal(productHref(PRODUCT_COLUMNS[0].items[1], true, "en"), "/dashboard/clients");
  assert.equal(productHref(PRODUCT_COLUMNS[0].items[2], false, "de"), null);
  assert.equal(productHref(PRODUCT_COLUMNS[1].items[0], false, "es"), "/es/estimates");
  assert.equal(productHref(PRODUCT_COLUMNS[1].items[2], false, "en"), null);
  assert.equal(
    productHref(PRODUCT_COLUMNS[1].items[1], false, "fr"),
    "/fr/login?callbackUrl=%2Fdashboard%2Finvoices&mode=register",
  );
  assert.equal(productHref(PRODUCT_COLUMNS[1].items[1], true, "fr"), "/dashboard/invoices");
  assert.equal(productHref(PRODUCT_COLUMNS[2].heading, false, "en"), "/en/contact");
  assert.ok(PRODUCT_COLUMNS[2].items.every((item) => productHref(item, false, "en") === null));
  assert.equal(
    productHref(PRODUCT_COLUMNS[3].items[2], false, "pt"),
    "/pt/login?callbackUrl=%2Fdashboard%2Fsettings%2Fquickbooks",
  );
  assert.equal(
    productHref(REWARDS_LINK, false, "en"),
    "/en/login?callbackUrl=%2Fdashboard%2Fsettings%2Frefer",
  );
  assert.equal(productHref(REWARDS_LINK, true, "es"), "/dashboard/settings/refer");

  const grid = readFileSync(path.join(import.meta.dirname, "../components/marketing/products-grid.tsx"), "utf8");
  assert.match(grid, /id="features"/);
  assert.match(grid, /copy\.allFeatures/);
  assert.match(grid, /copy\.earnRewards/);
  assert.match(grid, /copy\.comingSoon/);
  assert.match(grid, /#7eb526/);
  assert.match(grid, /#3e45d7/);

  const home = readFileSync(path.join(import.meta.dirname, "../app/[locale]/page.tsx"), "utf8");
  assert.match(home, /ProductsGrid/);
});
