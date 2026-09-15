import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCents, invoiceTotals, lineTotalCents, proposalTotalCents } from "./money";

test("line totals round to cents", () => {
  assert.equal(lineTotalCents(1.5, 125), 18750);
  assert.equal(lineTotalCents(3, 19.99), 5997);
});

test("invoice totals include tax", () => {
  const totals = invoiceTotals(
    [
      { quantity: 1, rate: 1000 },
      { quantity: 2, rate: 250 },
    ],
    8,
  );
  assert.equal(totals.subtotalCents, 150000);
  assert.equal(totals.taxCents, 12000);
  assert.equal(totals.totalCents, 162000);
});

test("proposal totals skip empty amounts", () => {
  assert.equal(
    proposalTotalCents([{ amount: 1200 }, { amount: null }, { amount: 300 }]),
    150000,
  );
});

test("formats usd", () => {
  assert.equal(formatCents(2450), "$24.50");
});
