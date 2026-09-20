import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTACT_EMAIL } from "./site";
import { isHttpUrl, resolveSponsorPlacement, SPONSOR_DEFAULTS, SPONSOR_ENV_KEYS } from "./sponsor";

test("defaults stay empty so the slot renders the advertise placeholder", () => {
  assert.equal(SPONSOR_DEFAULTS.name, "");
  assert.equal(SPONSOR_DEFAULTS.url, "");
  assert.equal(SPONSOR_DEFAULTS.logoUrl, "");
  assert.equal(SPONSOR_DEFAULTS.blurb, "");
  assert.equal(resolveSponsorPlacement(SPONSOR_DEFAULTS).active, false);
});

test("a named sponsor with an http(s) URL goes live", () => {
  const placement = resolveSponsorPlacement({
    name: "  Field Supply  ",
    url: "https://fieldsupply.example",
    logoUrl: "https://fieldsupply.example/logo.png",
    blurb: "Job-site gear for contractors who invoice.",
  });
  assert.deepEqual(placement, {
    active: true,
    name: "Field Supply",
    url: "https://fieldsupply.example",
    logoUrl: "https://fieldsupply.example/logo.png",
    blurb: "Job-site gear for contractors who invoice.",
  });
});

test("a name without a safe URL stays a placeholder", () => {
  const placement = resolveSponsorPlacement({
    name: "Field Supply",
    url: "javascript:alert(1)",
    logoUrl: "not-a-url",
    blurb: "ignored",
  });
  assert.equal(placement.active, false);
  assert.equal(placement.name, "");
  assert.equal(placement.url, "");
  assert.equal(placement.logoUrl, "");
  assert.equal(placement.blurb, "");
});

test("unsafe logo URLs are dropped on an otherwise valid sponsor", () => {
  const placement = resolveSponsorPlacement({
    name: "Field Supply",
    url: "http://fieldsupply.example",
    logoUrl: "data:image/png;base64,xxxx",
  });
  assert.equal(placement.active, true);
  assert.equal(placement.logoUrl, "");
});

test("isHttpUrl accepts only http and https", () => {
  assert.equal(isHttpUrl("https://invoiceflowstudio.com"), true);
  assert.equal(isHttpUrl("http://localhost:3000"), true);
  assert.equal(isHttpUrl("mailto:galit.igor@yahoo.com"), false);
  assert.equal(isHttpUrl("/advertise"), false);
});

test("env key names stay stable for Cloudflare / .env flips", () => {
  assert.deepEqual(SPONSOR_ENV_KEYS, {
    name: "SPONSOR_NAME",
    url: "SPONSOR_URL",
    logoUrl: "SPONSOR_LOGO_URL",
    blurb: "SPONSOR_BLURB",
  });
});

test("partner slot and advertise page stay labeled and never print the inbox", () => {
  const slot = readFileSync(path.join(import.meta.dirname, "../components/marketing/partner-slot.tsx"), "utf8");
  const page = readFileSync(path.join(import.meta.dirname, "../app/[locale]/advertise/page.tsx"), "utf8");
  assert.match(slot, /copy\.label/);
  assert.match(slot, /copy\.sponsored/);
  assert.match(slot, /rel="sponsored noopener noreferrer"/);
  assert.match(slot, /ADVERTISE_PATH/);
  assert.match(slot, /advertiseContactHref/);
  assert.equal(slot.includes(CONTACT_EMAIL), false);
  assert.equal(slot.includes("mailto:"), false);
  assert.equal(page.includes(CONTACT_EMAIL), false);
  assert.equal(page.includes("mailto:"), false);
  assert.match(page, /advertiseContactHref/);
  assert.match(page, /PartnerSlot/);
});
