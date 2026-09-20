import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CONTACT_API_PATH,
  CONTACT_FETCH_TIMEOUT_MS,
  collectContactAttachments,
  contactPlainText,
  parseContactInput,
  sanitizeContactHtml,
} from "./contact";

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

test("parseContactInput accepts the partnership topic from ?topic=partnership", () => {
  const parsed = parseContactInput({
    email: "brand@example.com",
    topic: "partnership",
    subject: "Homepage slot",
    descriptionHtml: "<p>We would like to sponsor the Partner slot.</p>",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.topic, "partnership");
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

test("collectContactAttachments copies bytes without Buffer", async () => {
  const form = new FormData();
  form.append("attachments", new File([new Uint8Array([1, 2, 3])], "brief.txt", { type: "text/plain" }));
  const collected = await collectContactAttachments(form);
  assert.equal(collected.success, true);
  if (collected.success) {
    assert.equal(collected.attachments[0]?.filename, "brief.txt");
    assert.deepEqual(Array.from(collected.attachments[0]?.content ?? []), [1, 2, 3]);
  }
});

test("contact form posts to a Route Handler and always clears Sending", () => {
  const form = readFileSync(path.join(import.meta.dirname, "../components/marketing/contact-form.tsx"), "utf8");
  const action = readFileSync(path.join(import.meta.dirname, "../app/actions/contact.ts"), "utf8");
  const email = readFileSync(path.join(import.meta.dirname, "../lib/email.ts"), "utf8");
  const route = readFileSync(path.join(import.meta.dirname, "../app/api/contact/route.ts"), "utf8");

  assert.equal(CONTACT_API_PATH, "/api/contact");
  assert.equal(CONTACT_FETCH_TIMEOUT_MS, 25_000);
  assert.match(form, /CONTACT_API_PATH/);
  assert.match(form, /method: "POST"/);
  assert.match(form, /finally/);
  assert.match(form, /setPending\(false\)/);
  assert.match(form, /CONTACT_FETCH_TIMEOUT_MS/);
  assert.doesNotMatch(form, /submitContactRequest/);
  assert.doesNotMatch(form, /from "@\/app\/actions\/contact"/);

  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /submitContactRequest/);
  assert.match(route, /force-dynamic/);
  assert.doesNotMatch(route, /runtime = "edge"/);

  assert.match(action, /ensureCloudflareContext/);
  assert.match(action, /copyCloudflareAuthEnvToProcess/);
  assert.match(action, /collectContactAttachments/);
  assert.doesNotMatch(action, /Buffer\.from/);
  assert.doesNotMatch(action, /instanceof File/);

  assert.match(email, /ensureCloudflareContext/);
  assert.match(email, /postResendEmail/);
  assert.match(email, /AUTH_RESEND_KEY/);
  assert.match(email, /CONTACT_TO/);
  assert.match(email, /not_configured/);
  assert.doesNotMatch(email, /from ["']resend["']/);
  assert.doesNotMatch(email, /new Resend/);
  assert.doesNotMatch(email, /Buffer/);
  assert.doesNotMatch(email, /isDevMode/);

  assert.match(action, /notConfigured/);
  assert.match(action, /deliveryFailed/);
});
