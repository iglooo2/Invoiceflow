import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInvoiceForm } from "./invoice-input";

function invoiceForm(overrides: Record<string, string> = {}, items?: unknown) {
  const form = new FormData();
  form.set("clientName", "Ada Lovelace");
  form.set("issueDate", "2026-09-18");
  form.set("dueDate", "2026-10-02");
  form.set("taxRate", "0");
  form.set("status", "draft");
  form.set(
    "itemsJson",
    JSON.stringify(items ?? [{ description: "Brand workshop", quantity: "1", rate: "850" }]),
  );
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

test("parseInvoiceForm accepts a complete invoice", () => {
  const parsed = parseInvoiceForm(invoiceForm());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.clientName, "Ada Lovelace");
  assert.equal(parsed.data.items.length, 1);
  assert.equal(parsed.data.items[0].description, "Brand workshop");
  assert.equal(parsed.data.items[0].rate, 850);
});

test("parseInvoiceForm returns a readable error for a blank client name", () => {
  const parsed = parseInvoiceForm(invoiceForm({ clientName: "" }));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /Client name/);
});

test("parseInvoiceForm drops empty extra lines instead of crashing", () => {
  const parsed = parseInvoiceForm(
    invoiceForm({}, [
      { description: "Logo suite", quantity: "1", rate: "1200" },
      { description: "  ", quantity: "1", rate: "0" },
    ]),
  );
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.items.length, 1);
  assert.equal(parsed.data.items[0].description, "Logo suite");
});

test("parseInvoiceForm asks for a line item when every description is empty", () => {
  const parsed = parseInvoiceForm(invoiceForm({}, [{ description: "", quantity: "1", rate: "0" }]));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /line item/i);
});

test("parseInvoiceForm does not throw on invalid items JSON", () => {
  const parsed = parseInvoiceForm(invoiceForm({ itemsJson: "{" }));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error, /invalid/i);
});
