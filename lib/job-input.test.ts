import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJobForm, parseJobIdForm } from "./job-input";

function jobForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("title", "Kitchen remodel");
  form.set("clientId", "client-1");
  form.set("address", "14 Shotwell St");
  form.set("startDate", "2026-09-19");
  form.set("endDate", "2026-10-02");
  form.set("notes", "Bring samples");
  form.set("completed", "off");
  form.set("estimateIdsJson", '["est-1"]');
  form.set("invoiceIdsJson", "[]");
  form.set("visitsJson", '[{"notes":"Site walk","scheduledAt":"2026-09-21"}]');
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

test("parseJobForm accepts a complete job", () => {
  const parsed = parseJobForm(jobForm());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.title, "Kitchen remodel");
  assert.equal(parsed.data.clientId, "client-1");
  assert.equal(parsed.data.status, "active");
  assert.deepEqual(parsed.data.estimateIds, ["est-1"]);
  assert.equal(parsed.data.visits[0]?.notes, "Site walk");
});

test("parseJobForm marks completed from the toggle", () => {
  const parsed = parseJobForm(jobForm({ completed: "on" }));
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.status, "complete");
});

test("parseJobForm requires a title", () => {
  const parsed = parseJobForm(jobForm({ title: "  " }));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /title/i);
});

test("parseJobIdForm reads the hidden id", () => {
  const form = new FormData();
  form.set("jobId", "job-1");
  const parsed = parseJobIdForm(form);
  assert.deepEqual(parsed, { success: true, data: { jobId: "job-1" } });
});
