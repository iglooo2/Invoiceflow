import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProposalDecisionForm, parseProposalForm, parseProposalIdForm } from "./proposal-input";

function proposalForm(overrides: Record<string, string> = {}, sections?: unknown) {
  const form = new FormData();
  form.set("title", "Picture edit");
  form.set("clientName", "Studio North");
  form.set("status", "draft");
  form.set(
    "sectionsJson",
    JSON.stringify(
      sections ?? [{ heading: "The cut", body: "Picture lock and selects.", amount: "" }],
    ),
  );
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

test("parseProposalForm accepts a complete proposal", () => {
  const parsed = parseProposalForm(proposalForm());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.sections[0].heading, "The cut");
  assert.equal(parsed.data.sections[0].amount, null);
});

test("parseProposalForm returns a readable error for a blank title", () => {
  const parsed = parseProposalForm(proposalForm({ title: "" }));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /Title/);
});

test("parseProposalDecisionForm reads hidden token and decision", () => {
  const form = new FormData();
  form.set("token", "abc123token");
  form.set("decision", "accepted");
  form.set("signedName", "Luna Alvarez");
  const parsed = parseProposalDecisionForm(form);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.token, "abc123token");
  assert.equal(parsed.data.decision, "accepted");
  assert.equal(parsed.data.signedName, "Luna Alvarez");
});

test("parseProposalDecisionForm requires a typed name to approve", () => {
  const form = new FormData();
  form.set("token", "abc123token");
  form.set("decision", "accepted");
  const parsed = parseProposalDecisionForm(form);
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /name/i);
});

test("parseProposalForm reads tax, markup, and attachments", () => {
  const parsed = parseProposalForm(
    proposalForm({
      taxRate: "8",
      markupRate: "10",
      attachmentsJson: JSON.stringify([{ name: "site.jpg" }]),
    }),
  );
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.taxRate, 8);
  assert.equal(parsed.data.markupRate, 10);
  assert.match(parsed.data.attachments ?? "", /site\.jpg/);
});

test("parseProposalDecisionForm rejects a two-arg bind mixup", () => {
  assert.equal(parseProposalIdForm(new FormData()).success, false);
  const form = new FormData();
  form.set("token", "abc123token");
  form.set("decision", "[object FormData]");
  const parsed = parseProposalDecisionForm(form);
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.match(parsed.error, /approve or decline/);
});

test("parseProposalForm does not throw on invalid sections JSON", () => {
  const parsed = parseProposalForm(proposalForm({ sectionsJson: "not-json" }));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /invalid/i);
});
