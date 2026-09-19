import { test } from "node:test";
import assert from "node:assert/strict";
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
  paymentTermsLabel,
  shouldNotify,
  splitPersonName,
  EMPTY_STUDIO_SETTINGS,
  normalizeStudioSettings,
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
