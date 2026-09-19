import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ESTIMATE_LIST_PATH,
  ESTIMATE_MARKETING_PATH,
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
