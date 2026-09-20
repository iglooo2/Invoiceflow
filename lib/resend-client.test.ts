import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RESEND_API_URL,
  RESEND_REQUEST_TIMEOUT_MS,
  bytesToBase64,
  postResendEmail,
  resendAttachmentPayload,
} from "./resend-client";

test("bytesToBase64 encodes attachment bytes without Buffer", () => {
  const bytes = new Uint8Array([72, 105]);
  assert.equal(bytesToBase64(bytes), btoa("Hi"));
  assert.equal(resendAttachmentPayload({ filename: "note.txt", content: bytes }).content, "SGk=");
});

test("postResendEmail posts JSON to the Resend HTTP API over fetch", async () => {
  let url = "";
  let method = "";
  let authorization = "";
  let payload: Record<string, unknown> = {};
  const result = await postResendEmail({
    apiKey: "re_test_key",
    from: "InvoiceFlow Studio <noreply@invoiceflowstudio.com>",
    to: "galit.igor@yahoo.com",
    replyTo: "maya@studio.example",
    subject: "[InvoiceFlow] partnership: Collab",
    html: "<p>Hello</p>",
    text: "Hello",
    attachments: [{ filename: "brief.txt", content: new Uint8Array([72, 105]) }],
    fetchImpl: async (input, init) => {
      url = String(input);
      method = String(init?.method);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.equal(result.sent, true);
  assert.equal(url, RESEND_API_URL);
  assert.equal(method, "POST");
  assert.equal(authorization, "Bearer re_test_key");
  assert.deepEqual(payload.to, ["galit.igor@yahoo.com"]);
  assert.equal(payload.reply_to, "maya@studio.example");
  assert.equal(payload.subject, "[InvoiceFlow] partnership: Collab");
  assert.ok(Array.isArray(payload.attachments));
});

test("postResendEmail treats HTTP errors as a failed send", async () => {
  const result = await postResendEmail({
    apiKey: "re_bad",
    from: "noreply@invoiceflowstudio.com",
    to: "a@b.co",
    subject: "Hi",
    html: "<p>Hi</p>",
    fetchImpl: async () => new Response(JSON.stringify({ message: "invalid API key" }), { status: 401 }),
  });
  assert.equal(result.sent, false);
  if (result.sent) throw new Error("expected failure");
  assert.match(result.error, /401/);
});

test("postResendEmail times out instead of hanging", async () => {
  const result = await postResendEmail({
    apiKey: "re_test",
    from: "noreply@invoiceflowstudio.com",
    to: "a@b.co",
    subject: "Hi",
    html: "<p>Hi</p>",
    timeoutMs: 20,
    fetchImpl: (_input, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });
  assert.equal(result.sent, false);
  if (result.sent) throw new Error("expected timeout");
  assert.match(result.error, /timed out/i);
  assert.equal(RESEND_REQUEST_TIMEOUT_MS, 15_000);
});
