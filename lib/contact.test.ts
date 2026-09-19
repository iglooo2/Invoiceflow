import { test } from "node:test";
import assert from "node:assert/strict";
import { contactPlainText, parseContactInput, sanitizeContactHtml } from "./contact";

test("parseContactInput accepts a complete request", () => {
  const parsed = parseContactInput({
    email: "maya@studio.example",
    topic: "support",
    subject: "Need a hand",
    descriptionHtml: "<p>The invoice PDF will not download.</p>",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "maya@studio.example");
    assert.equal(parsed.data.topic, "support");
    assert.equal(parsed.data.description, "The invoice PDF will not download.");
  }
});

test("parseContactInput rejects a missing topic or blank description", () => {
  assert.equal(parseContactInput({ email: "a@b.co", topic: "", subject: "Hi", descriptionHtml: "<p>x</p>" }).success, false);
  assert.equal(parseContactInput({ email: "a@b.co", topic: "other", subject: "Hi", descriptionHtml: "<p></p>" }).success, false);
  assert.equal(parseContactInput({ email: "not-an-email", topic: "other", subject: "Hi", descriptionHtml: "<p>hello</p>" }).success, false);
});

test("sanitizeContactHtml strips scripts and keeps safe markup", () => {
  const cleaned = sanitizeContactHtml('<p>Hello<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><a href="https://ok.example">y</a>');
  assert.equal(cleaned.includes("script"), false);
  assert.equal(cleaned.includes("javascript:"), false);
  assert.match(cleaned, /https:\/\/ok\.example/);
  assert.equal(contactPlainText("<p>Line one</p><p>Line two</p>").includes("Line one"), true);
});
