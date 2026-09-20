import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  accountNameFromParts,
  composeBusinessAddress,
  dueDateFromPaymentTerms,
  parseAccountForm,
  parseCompanyForm,
  parseDocumentsForm,
  parseMarkupForm,
  parsePreferencesForm,
  parseTaxForm,
  parseContractForm,
  parseReferralGenerateForm,
  paymentTermsLabel,
  shouldNotify,
  splitPersonName,
  EMPTY_STUDIO_SETTINGS,
  normalizeStudioSettings,
  studioSettingsSelect,
  ACCOUNT_SETTINGS_SELECT,
  STUDIO_SETTINGS_BLOB_COLUMNS,
} from "./studio-settings";

test("splitPersonName keeps a trailing last name", () => {
  assert.deepEqual(splitPersonName("Maya Chen"), { firstName: "Maya", lastName: "Chen" });
  assert.deepEqual(splitPersonName("Igor"), { firstName: "Igor", lastName: "" });
  assert.deepEqual(splitPersonName("  "), { firstName: "", lastName: "" });
});

test("composeBusinessAddress drops empty lines", () => {
  assert.equal(
    composeBusinessAddress({
      addressLine1: "14 Shotwell St",
      city: "San Francisco",
      region: "CA",
      postalCode: "94110",
      country: "United States",
    }),
    "14 Shotwell St\nSan Francisco, CA, 94110\nUnited States",
  );
  assert.equal(composeBusinessAddress({}), "");
});

test("parseAccountForm requires matching passwords when set", () => {
  const form = new FormData();
  form.set("firstName", "Maya");
  form.set("lastName", "Chen");
  form.set("email", "maya@studionorth.example");
  form.set("defaultCurrency", "EUR");
  form.set("documentLocale", "sv-SE");
  const ok = parseAccountForm(form);
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.defaultCurrency, "EUR");
    assert.equal(ok.data.documentLocale, "sv-SE");
    assert.equal(ok.data.password, "");
  }

  form.set("password", "short");
  form.set("confirmPassword", "short");
  const short = parseAccountForm(form);
  assert.equal(short.success, false);

  form.set("password", "longenough");
  form.set("confirmPassword", "different1");
  const mismatch = parseAccountForm(form);
  assert.equal(mismatch.success, false);

  form.set("confirmPassword", "longenough");
  const saved = parseAccountForm(form);
  assert.equal(saved.success, true);
});

test("parseCompanyForm writes a combined businessAddress for PDFs", () => {
  const form = new FormData();
  form.set("businessName", "Studio North");
  form.set("addressLine1", "14 Shotwell St");
  form.set("city", "San Francisco");
  form.set("region", "CA");
  form.set("country", "United States");
  form.set("industry", "design");
  form.set("employeeCount", "2-5");
  const parsed = parseCompanyForm(form);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.match(parsed.data.businessAddress, /14 Shotwell St/);
    assert.match(parsed.data.businessAddress, /United States/);
    assert.equal(parsed.data.industry, "design");
    assert.equal(parsed.data.employeeCount, "2-5");
  }
});

test("parsePreferencesForm reads toggles as booleans", () => {
  const form = new FormData();
  form.set("emailEstimateMessage", "Hello");
  form.set("notifyClientOpensEmail", "on");
  form.set("notifyClientSigns", "on");
  const parsed = parsePreferencesForm(form);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.notifyClientOpensEmail, true);
    assert.equal(parsed.data.notifyEmailNotDelivered, false);
    assert.equal(parsed.data.notifyClientViews, false);
    assert.equal(parsed.data.emailInvoiceMessage.length > 0, true);
  }
});

test("document and markup parsers reject out-of-range numbers", () => {
  const docs = new FormData();
  docs.set("paymentTermsDays", "400");
  assert.equal(parseDocumentsForm(docs).success, false);
  docs.set("paymentTermsDays", "0");
  const okDocs = parseDocumentsForm(docs);
  assert.equal(okDocs.success, true);

  const markup = new FormData();
  markup.set("defaultMarkupPercent", "12.5");
  const okMarkup = parseMarkupForm(markup);
  assert.equal(okMarkup.success, true);
  if (okMarkup.success) assert.equal(okMarkup.data.defaultMarkupPercent, 12.5);
  markup.set("defaultMarkupPercent", "-1");
  assert.equal(parseMarkupForm(markup).success, false);
});

test("parseTaxForm requires a name and 0-100 rate", () => {
  const form = new FormData();
  form.set("rate", "8.25");
  assert.equal(parseTaxForm(form).success, false);
  form.set("name", "CA");
  const parsed = parseTaxForm(form);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "CA");
    assert.equal(parsed.data.rate, 8.25);
  }
});

test("parseContractForm requires a name and reads default toggles", () => {
  const form = new FormData();
  form.set("details", "By signing this document, the customer agrees.");
  assert.equal(parseContractForm(form).success, false);
  form.set("name", "Generic Contract");
  form.set("defaultForEstimates", "on");
  form.set("defaultForInvoices", "on");
  const parsed = parseContractForm(form);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "Generic Contract");
    assert.equal(parsed.data.defaultForEstimates, true);
    assert.equal(parsed.data.defaultForInvoices, true);
  }
});

test("parseReferralGenerateForm requires the terms checkbox", () => {
  const form = new FormData();
  assert.equal(parseReferralGenerateForm(form).success, false);
  form.set("agreeTerms", "on");
  assert.equal(parseReferralGenerateForm(form).success, true);
});

test("payment terms of 0 are due upon receipt", () => {
  const issue = new Date("2026-09-19T12:00:00Z");
  assert.equal(paymentTermsLabel(0), "Due Upon Receipt");
  assert.equal(dueDateFromPaymentTerms(issue, 0).toISOString().slice(0, 10), "2026-09-19");
  assert.equal(dueDateFromPaymentTerms(issue, 14).toISOString().slice(0, 10), "2026-10-03");
});

test("shouldNotify collapses open/view into one email", () => {
  const both = { ...EMPTY_STUDIO_SETTINGS, notifyClientOpensEmail: true, notifyClientViews: false };
  assert.equal(shouldNotify(both, "opens"), true);
  assert.equal(shouldNotify({ ...EMPTY_STUDIO_SETTINGS, notifyClientOpensEmail: false, notifyClientViews: false }, "opens"), false);
  assert.equal(shouldNotify({ ...EMPTY_STUDIO_SETTINGS, notifyClientSigns: false }, "signs"), false);
});

test("normalizeStudioSettings fills email copy defaults", () => {
  const row = normalizeStudioSettings({ defaultCurrency: "SEK", notifyClientOpensEmail: false });
  assert.equal(row.defaultCurrency, "SEK");
  assert.equal(row.notifyClientOpensEmail, false);
  assert.match(row.emailEstimateMessage, /excited/);
});

test("accountNameFromParts prefers first + last", () => {
  assert.equal(accountNameFromParts("Maya", "Chen", "Old"), "Maya Chen");
  assert.equal(accountNameFromParts("", "", "Old"), "Old");
});

test("studioSettingsSelect omits upload blobs unless asked", () => {
  const none = studioSettingsSelect();
  for (const column of STUDIO_SETTINGS_BLOB_COLUMNS) {
    assert.equal(column in none, false);
  }
  assert.equal("firstName" in none, true);
  assert.equal("licenseFileName" in none, true);

  const logo = studioSettingsSelect("logo");
  assert.equal("logoDataUrl" in logo, true);
  assert.equal("licenseDataUrl" in logo, false);

  const docs = studioSettingsSelect("docs");
  assert.equal("logoDataUrl" in docs, false);
  assert.equal("licenseDataUrl" in docs, true);
  assert.equal("insuranceDataUrl" in docs, true);

  const all = studioSettingsSelect("all");
  for (const column of STUDIO_SETTINGS_BLOB_COLUMNS) {
    assert.equal(column in all, true);
  }
});

test("normalizeStudioSettings treats omitted blobs as empty strings", () => {
  const row = normalizeStudioSettings({ firstName: "Maya", lastName: "Chen", defaultCurrency: "EUR" });
  assert.equal(row.firstName, "Maya");
  assert.equal(row.logoDataUrl, "");
  assert.equal(row.licenseDataUrl, "");
  assert.equal(row.insuranceDataUrl, "");
});

test("My Account SSR skips settings blobs, bcrypt, and the full settings actions module", () => {
  const root = path.join(import.meta.dirname, "..");
  const accountPage = readFileSync(path.join(root, "app/dashboard/settings/account/page.tsx"), "utf8");
  const accountAction = readFileSync(path.join(root, "app/actions/account.ts"), "utf8");
  const settingsAction = readFileSync(path.join(root, "app/actions/settings.ts"), "utf8");
  const store = readFileSync(path.join(root, "lib/studio-settings-store.ts"), "utf8");
  const companyPage = readFileSync(path.join(root, "app/dashboard/settings/company/page.tsx"), "utf8");
  const i18n = readFileSync(path.join(root, "lib/i18n-request.ts"), "utf8");

  assert.match(accountPage, /loadAccountSettings/);
  assert.match(accountPage, /from "@\/app\/actions\/account"/);
  assert.doesNotMatch(accountPage, /from "@\/app\/actions\/settings"/);
  assert.doesNotMatch(accountPage, /loadStudioSettings/);

  assert.match(accountAction, /await import\("bcryptjs"\)/);
  assert.doesNotMatch(accountAction, /import bcrypt from "bcryptjs"/);
  assert.doesNotMatch(accountAction, /fileToStoredUpload/);

  assert.doesNotMatch(settingsAction, /bcrypt/);
  assert.doesNotMatch(settingsAction, /updateAccount/);
  assert.match(settingsAction, /uploads: "logo"/);
  assert.match(settingsAction, /uploads: "docs"/);

  assert.match(store, /studioSettingsSelect\(options\.uploads \?\? "none"\)/);
  assert.match(store, /ACCOUNT_SETTINGS_SELECT/);
  assert.doesNotMatch(store, /findUnique\(\{ where: \{ userId \} \}\)/);

  assert.match(companyPage, /uploads: "logo"/);
  assert.equal("firstName" in ACCOUNT_SETTINGS_SELECT, true);
  assert.equal("logoDataUrl" in ACCOUNT_SETTINGS_SELECT, false);

  assert.match(i18n, /export const appCopy = cache\(async/);
});
