import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ESTIMATE_LIST_PATH,
  ESTIMATE_MARKETING_PATH,
  ESTIMATE_STATUSES,
  estimateDetailPath,
  estimateStatusLabel,
  formatEstimateDate,
  parseAttachmentsJson,
  serializeAttachments,
} from "./estimates";

test("estimate paths stay on the InvoiceFlow dashboard", () => {
  assert.equal(ESTIMATE_LIST_PATH, "/dashboard/estimates");
  assert.equal(ESTIMATE_MARKETING_PATH, "/estimates");
  assert.equal(estimateDetailPath("abc"), "/dashboard/estimates/abc");
});

test("accepted estimates display as approved", () => {
  assert.equal(estimateStatusLabel("accepted"), "approved");
  assert.equal(estimateStatusLabel("sent"), "sent");
  assert.equal(estimateStatusLabel("pending"), "pending");
});

test("pending is an estimate status and not an invoice status", () => {
  const root = path.join(import.meta.dirname, "..");
  assert.deepEqual([...ESTIMATE_STATUSES], ["draft", "sent", "pending", "accepted", "declined"]);

  const estimatesPage = readFileSync(path.join(root, "app/dashboard/estimates/page.tsx"), "utf8");
  const proposalForm = readFileSync(path.join(root, "components/proposal-form.tsx"), "utf8");
  const invoicesPage = readFileSync(path.join(root, "app/dashboard/invoices/page.tsx"), "utf8");
  const invoiceForm = readFileSync(path.join(root, "components/invoice-form.tsx"), "utf8");
  const invoiceInput = readFileSync(path.join(root, "lib/invoice-input.ts"), "utf8");

  assert.match(estimatesPage, /ESTIMATE_STATUSES/);
  assert.match(proposalForm, /ESTIMATE_STATUSES/);
  assert.doesNotMatch(invoicesPage, /pending/);
  assert.doesNotMatch(invoiceForm, /pending/);
  assert.doesNotMatch(invoiceInput, /pending/);
});

test("formatEstimateDate skips invalid values", () => {
  assert.equal(formatEstimateDate(new Date(2026, 8, 19), "yyyy-MM-dd"), "2026-09-19");
  assert.equal(formatEstimateDate(null, "MMM d"), "");
  assert.equal(formatEstimateDate("not-a-date", "MMM d"), "");
});

test("attachment JSON keeps names and drops blanks", () => {
  const raw = serializeAttachments([
    { name: "site.jpg" },
    { name: "  " },
    { name: "scope.pdf", note: "before photos" },
  ]);
  assert.deepEqual(parseAttachmentsJson(raw), [
    { name: "site.jpg" },
    { name: "scope.pdf", note: "before photos" },
  ]);
  assert.deepEqual(parseAttachmentsJson("not-json"), []);
});
