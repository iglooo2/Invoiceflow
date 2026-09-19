import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applySubscriptionWrite,
  clearSubscriptionWrite,
  handleStripeWebhookEvent,
  invoiceSubscriptionId,
  planActionFromStatus,
  stripeId,
  subscriptionPeriodEnd,
  subscriptionWriteFromInvoice,
  subscriptionWriteFromStripe,
  unixToDate,
  type SubscriptionUserStore,
} from "./subscription-writes";

const root = path.join(import.meta.dirname, "..");

function mockDb(users: Array<{ id: string; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null }>) {
  const calls: Array<{ op: string; where?: unknown; data?: unknown }> = [];
  const db = {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; stripeCustomerId?: string; stripeSubscriptionId?: string };
      }) => {
        calls.push({ op: "user.findUnique", where });
        const user = users.find((row) => {
          if (where.id) return row.id === where.id;
          if (where.stripeCustomerId) return row.stripeCustomerId === where.stripeCustomerId;
          if (where.stripeSubscriptionId) return row.stripeSubscriptionId === where.stripeSubscriptionId;
          return false;
        });
        return user ? { id: user.id } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        calls.push({ op: "user.update", where, data });
        return { id: where.id, ...data };
      },
      updateMany: async () => {
        throw new Error("Transactions are not supported in HTTP mode");
      },
    },
  };
  return { db: db as unknown as SubscriptionUserStore & { user: typeof db.user }, calls };
}

const period = 1_800_000_000;

function activeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    object: "subscription",
    status: "active",
    customer: "cus_123",
    metadata: {},
    items: {
      data: [{ current_period_end: period, price: { id: "price_pro" } }],
    },
    ...overrides,
  };
}

test("stripeId reads string ids and expanded objects, not [object Object]", () => {
  assert.equal(stripeId("cus_123"), "cus_123");
  assert.equal(stripeId({ id: "cus_123" }), "cus_123");
  assert.equal(stripeId(""), null);
  assert.equal(stripeId("[object Object]"), null);
  assert.equal(unixToDate(period)?.toISOString(), new Date(period * 1000).toISOString());
  assert.equal(unixToDate("1800000000"), null);
});

test("period end prefers subscription items, then the deprecated root field", () => {
  assert.deepEqual(
    subscriptionPeriodEnd({ items: { data: [{ current_period_end: period }] } }),
    new Date(period * 1000),
  );
  assert.deepEqual(subscriptionPeriodEnd({ current_period_end: period }), new Date(period * 1000));
  assert.equal(subscriptionPeriodEnd({ items: undefined }), null);
});

test("plan mapping keeps incomplete from racing a completed checkout", () => {
  assert.equal(planActionFromStatus("active"), "pro");
  assert.equal(planActionFromStatus("trialing"), "pro");
  assert.equal(planActionFromStatus("past_due"), "pro");
  assert.equal(planActionFromStatus("incomplete"), "keep");
  assert.equal(planActionFromStatus("canceled"), "free");
});

test("incomplete subscription.updated writes ids but does not flip plan", async () => {
  const { db, calls } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123" }]);
  await applySubscriptionWrite(
    db,
    subscriptionWriteFromStripe(activeSubscription({ status: "incomplete" })),
  );
  const data = calls[1]?.data as { plan?: string; stripeSubscriptionId?: string };
  assert.equal(data.plan, undefined);
  assert.equal(data.stripeSubscriptionId, "sub_123");
});

test("subscription.updated finds by customer then updates by id — no updateMany", async () => {
  const { db, calls } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123" }]);
  const result = await applySubscriptionWrite(db, subscriptionWriteFromStripe(activeSubscription()));

  assert.equal(result.updated, true);
  assert.equal(result.userId, "user-1");
  assert.deepEqual(
    calls.map((call) => call.op),
    ["user.findUnique", "user.update"],
  );
  assert.deepEqual(calls[0]?.where, { stripeCustomerId: "cus_123" });
  assert.deepEqual(calls[1]?.where, { id: "user-1" });
  assert.equal((calls[1]?.data as { plan?: string }).plan, "pro");
  assert.equal((calls[1]?.data as { stripeSubscriptionId?: string }).stripeSubscriptionId, "sub_123");
  assert.deepEqual(
    (calls[1]?.data as { stripeCurrentPeriodEnd?: Date }).stripeCurrentPeriodEnd,
    new Date(period * 1000),
  );
});

test("subscription.updated is a no-op when no user matches — does not 500", async () => {
  const { db, calls } = mockDb([]);
  const result = await applySubscriptionWrite(db, subscriptionWriteFromStripe(activeSubscription()));
  assert.equal(result.updated, false);
  assert.deepEqual(
    calls.map((call) => call.op),
    ["user.findUnique", "user.findUnique"],
  );
});

test("subscription.updated is idempotent when Stripe retries the same payload", async () => {
  const { db } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123" }]);
  const write = subscriptionWriteFromStripe(activeSubscription());
  const first = await applySubscriptionWrite(db, write);
  const second = await applySubscriptionWrite(db, write);
  assert.equal(first.updated, true);
  assert.equal(second.updated, true);
  assert.equal(first.userId, second.userId);
});

test("unique conflicts still refresh plan and period instead of 500ing", async () => {
  const { db, calls } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123" }]);
  db.user.update = async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    calls.push({ op: "user.update", where, data });
    if (data.stripeSubscriptionId) {
      throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    }
    return { id: where.id, ...data };
  };

  const result = await applySubscriptionWrite(db, subscriptionWriteFromStripe(activeSubscription()));
  assert.equal(result.updated, true);
  assert.equal(calls.filter((call) => call.op === "user.update").length, 2);
  const retry = calls.at(-1)?.data as { plan?: string; stripeSubscriptionId?: string };
  assert.equal(retry.plan, "pro");
  assert.equal(retry.stripeSubscriptionId, undefined);
});

test("deleted subscription clears plan with find-then-update", async () => {
  const { db, calls } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123" }]);
  const result = await clearSubscriptionWrite(db, { customerId: "cus_123", subscriptionId: "sub_123" });
  assert.equal(result.updated, true);
  assert.deepEqual(calls[1]?.data, {
    plan: "free",
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
  });
});

test("invoice.paid reads Basil parent.subscription_details and extends period", () => {
  const write = subscriptionWriteFromInvoice({
    customer: "cus_123",
    parent: { subscription_details: { subscription: "sub_123" } },
    lines: {
      data: [{ period: { end: period }, pricing: { price_details: { price: "price_pro" } } }],
    },
  });
  assert.equal(invoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_123" } } }), "sub_123");
  assert.equal(write?.plan, "pro");
  assert.equal(write?.subscriptionId, "sub_123");
  assert.equal(write?.priceId, "price_pro");
  assert.deepEqual(write?.periodEnd, new Date(period * 1000));
});

test("webhook dispatcher keeps checkout retrieve + invoice.paid no-ops working", async () => {
  const { db } = mockDb([{ id: "user-1", stripeCustomerId: "cus_123" }]);
  const stripe = {
    subscriptions: {
      retrieve: async (id: string) => activeSubscription({ id }),
    },
  };

  const checkout = await handleStripeWebhookEvent(db, stripe, {
    type: "checkout.session.completed",
    data: {
      object: {
        object: "checkout.session",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { userId: "user-1" },
      },
    },
  });
  assert.equal(checkout.updated, true);

  const invoice = await handleStripeWebhookEvent(db, stripe, {
    type: "invoice.paid",
    data: {
      object: {
        customer: "cus_123",
        subscription: "sub_123",
        lines: { data: [{ period: { end: period }, price: { id: "price_pro" } }] },
      },
    },
  });
  assert.equal(invoice.updated, true);

  const ignored = await handleStripeWebhookEvent(db, stripe, {
    type: "ping",
    data: { object: {} },
  });
  assert.equal(ignored.updated, false);
});

test("webhook and subscription helpers never use $transaction or updateMany", () => {
  const files = [
    "lib/subscription-writes.ts",
    "app/api/stripe/webhook/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /\$transaction/);
    assert.doesNotMatch(source, /updateMany/);
    assert.doesNotMatch(source, /startTransaction/);
  }
});
