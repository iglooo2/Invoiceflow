import { test } from "node:test";
import assert from "node:assert/strict";
import { canCreateDocument, currentPlanId, isProPlan } from "./plans";

test("free plan blocks the 4th invoice", () => {
  const allowed = canCreateDocument({
    plan: "free",
    kind: "invoice",
    createdThisMonth: 2,
  });
  const blocked = canCreateDocument({
    plan: "free",
    kind: "invoice",
    createdThisMonth: 3,
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.remaining, 1);
  assert.equal(blocked.ok, false);
});

test("pro is unlimited", () => {
  const check = canCreateDocument({
    plan: "pro",
    kind: "proposal",
    createdThisMonth: 80,
  });
  assert.equal(check.ok, true);
});

test("expired stripe period falls back to free", () => {
  assert.equal(
    isProPlan({
      plan: "pro",
      stripeCurrentPeriodEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    }),
    false,
  );
  assert.equal(
    currentPlanId({
      plan: "pro",
      stripeCurrentPeriodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    }),
    "pro",
  );
});
