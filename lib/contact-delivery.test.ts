import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTACT_EMAIL } from "./site";
import { classifyResendFailure, extractEmailAddress, resolveContactMailbox } from "./contact-delivery";

test("extractEmailAddress accepts bare and display-name addresses", () => {
  assert.equal(extractEmailAddress(" Maya@Studio.example "), "maya@studio.example");
  assert.equal(extractEmailAddress("InvoiceFlow <noreply@invoiceflowstudio.com>"), "noreply@invoiceflowstudio.com");
  assert.equal(extractEmailAddress("not-an-email"), "");
  assert.equal(extractEmailAddress(""), "");
});

test("resolveContactMailbox prefers CONTACT_TO then CONTACT_EMAIL then the default inbox", () => {
  assert.equal(resolveContactMailbox("igor@invoiceflowstudio.com", "other@example.com"), "igor@invoiceflowstudio.com");
  assert.equal(resolveContactMailbox("", " CONTACT_INBOX@example.com "), "contact_inbox@example.com");
  assert.equal(resolveContactMailbox("", "bogus", undefined), CONTACT_EMAIL);
  assert.equal(CONTACT_EMAIL, "galit.igor@yahoo.com");
});

test("classifyResendFailure treats bad/missing API keys as not configured", () => {
  assert.equal(classifyResendFailure("Resend 401: {\"message\":\"invalid API key\"}"), "not_configured");
  assert.equal(classifyResendFailure("Unauthorized"), "not_configured");
  assert.equal(
    classifyResendFailure("Resend 403: {\"name\":\"validation_error\",\"message\":\"The invoiceflowstudio.com domain is not verified\"}"),
    "send_failed",
  );
  assert.equal(classifyResendFailure("Resend request timed out"), "send_failed");
});

test("invoice and estimate email actions do not mark sent when delivery fails", () => {
  for (const file of ["app/actions/invoices.ts", "app/actions/proposals.ts"]) {
    const source = readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
    const blocked = source.indexOf("if (!delivery.sent)");
    const marked = source.indexOf('data: { status: "sent" }');
    assert.ok(blocked > 0 && marked > blocked, file);
    assert.match(source, /dict\.app\.errors\.emailNotConfigured/);
    assert.match(source, /dict\.app\.errors\.emailDeliveryFailed/);
  }
  const email = readFileSync(path.join(import.meta.dirname, "email.ts"), "utf8");
  assert.match(email, /reason: "not_configured"/);
  assert.match(email, /classifyResendFailure\(result\.error\)/);
});
