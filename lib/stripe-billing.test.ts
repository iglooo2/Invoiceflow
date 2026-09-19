import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BILLING_EMAIL_REQUIRED,
  createBillingPortalSession,
  createProCheckoutSession,
  replaceStripeCustomerForUser,
  resolveStripeCustomerForUser,
  savedStripeCustomerId,
  type BillingUser,
  type BillingUserStore,
  type StripeBillingClient,
} from "./stripe-billing";
import { isMissingStripeCustomerError, stripeFailureMessage } from "./stripe-env";

type StripeBillingCustomer = { id: string; deleted?: boolean };

function missingCustomerError(id = "cus_test") {
  return Object.assign(new Error(`No such customer: '${id}'; a similar object exists in test mode, but a live mode key was used to make this request.`), {
    code: "resource_missing",
    param: "customer",
  });
}

function taxError() {
  return Object.assign(new Error("The product tax code is missing. Managed Payments is enabled by default for this account."), {
    code: "parameter_invalid_empty",
    param: "line_items[0]",
  });
}

function mockDb(startingId: string | null = "cus_old") {
  const calls: Array<{ stripeCustomerId: string | null }> = [];
  let stored = startingId;
  const db: BillingUserStore = {
    user: {
      update: async ({ data }) => {
        stored = data.stripeCustomerId;
        calls.push({ stripeCustomerId: data.stripeCustomerId });
        return { id: "user_1", stripeCustomerId: data.stripeCustomerId };
      },
    },
  };
  return { db, calls, stored: () => stored };
}

function mockStripe(options: {
  retrieve?: (id: string) => Promise<{ id: string; deleted?: boolean }>;
  list?: StripeBillingCustomer[];
  createId?: string;
  checkout?: (params: { customer?: string; managed_payments?: { enabled?: boolean } }) => Promise<{ url?: string | null }>;
  portal?: (customer: string) => Promise<{ url: string }>;
}) {
  const created: string[] = [];
  const checkoutCalls: Array<{ customer?: string; managed_payments?: { enabled?: boolean } }> = [];
  const stripe = {
    customers: {
      retrieve: options.retrieve ?? (async (id: string) => ({ id })),
      list: async () => ({ data: options.list ?? [] }),
      create: async () => {
        const id = options.createId ?? `cus_new_${created.length + 1}`;
        created.push(id);
        return { id };
      },
    },
    checkout: {
      sessions: {
        create: async (params: { customer?: string; managed_payments?: { enabled?: boolean } }) => {
          checkoutCalls.push({ customer: params.customer, managed_payments: params.managed_payments });
          if (options.checkout) return options.checkout(params);
          return { url: "https://checkout.stripe.com/c/pay/cs_test" };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async ({ customer }: { customer: string }) => {
          if (options.portal) return options.portal(customer);
          return { url: `https://billing.stripe.com/p/session/${customer}` };
        },
      },
    },
  };
  return { stripe: stripe as unknown as StripeBillingClient, created, checkoutCalls };
}

const user: BillingUser = {
  id: "user_1",
  email: "ada@example.com",
  name: "Ada",
  stripeCustomerId: "cus_test_leftover",
};

test("savedStripeCustomerId accepts cus_ ids only, not leftovers or sub_ mixups", () => {
  assert.equal(savedStripeCustomerId("cus_live123"), "cus_live123");
  assert.equal(savedStripeCustomerId(null), null);
  assert.equal(savedStripeCustomerId("null"), null);
  assert.equal(savedStripeCustomerId("undefined"), null);
  assert.equal(savedStripeCustomerId("sub_leftover"), null);
  assert.equal(savedStripeCustomerId(""), null);
});

test("resolveStripeCustomerForUser creates a customer when stripeCustomerId is NULL", async () => {
  const { db, calls } = mockDb(null);
  const { stripe, created } = mockStripe({ createId: "cus_live_new" });
  const result = await resolveStripeCustomerForUser({
    user: { ...user, stripeCustomerId: null },
    stripe,
    db,
  });
  assert.equal(result.customerId, "cus_live_new");
  assert.equal(result.created, true);
  assert.deepEqual(created, ["cus_live_new"]);
  assert.deepEqual(calls.at(-1), { stripeCustomerId: "cus_live_new" });
});

test("resolveStripeCustomerForUser reuses a Live customer by email after the id was cleared", async () => {
  const { db, calls } = mockDb(null);
  const { stripe, created } = mockStripe({
    list: [{ id: "cus_live_existing" }],
    createId: "cus_should_not_create",
  });
  const result = await resolveStripeCustomerForUser({
    user: { ...user, stripeCustomerId: null },
    stripe,
    db,
  });
  assert.equal(result.customerId, "cus_live_existing");
  assert.equal(result.created, false);
  assert.deepEqual(created, []);
  assert.deepEqual(calls.at(-1), { stripeCustomerId: "cus_live_existing" });
});

test("resolveStripeCustomerForUser clears a leftover test cus_ and creates a Live customer", async () => {
  const { db, calls } = mockDb("cus_test_leftover");
  const { stripe, created } = mockStripe({
    retrieve: async () => {
      throw missingCustomerError("cus_test_leftover");
    },
    createId: "cus_live_replacement",
  });
  const result = await resolveStripeCustomerForUser({ user, stripe, db });
  assert.equal(result.customerId, "cus_live_replacement");
  assert.equal(result.replaced, true);
  assert.deepEqual(created, ["cus_live_replacement"]);
  assert.equal(calls[0]?.stripeCustomerId, null);
  assert.equal(calls.at(-1)?.stripeCustomerId, "cus_live_replacement");
});

test("resolveStripeCustomerForUser keeps a customer that exists in this mode", async () => {
  const { db, calls } = mockDb("cus_live_ok");
  const { stripe, created } = mockStripe();
  const result = await resolveStripeCustomerForUser({
    user: { ...user, stripeCustomerId: "cus_live_ok" },
    stripe,
    db,
  });
  assert.equal(result.customerId, "cus_live_ok");
  assert.equal(result.replaced, false);
  assert.deepEqual(created, []);
  assert.equal(calls.length, 0);
});

test("resolveStripeCustomerForUser replaces a leftover sub_ stored in stripeCustomerId", async () => {
  const { db, calls } = mockDb("sub_test");
  const { stripe, created } = mockStripe({ createId: "cus_from_sub_mixup" });
  const result = await resolveStripeCustomerForUser({
    user: { ...user, stripeCustomerId: "sub_test" },
    stripe,
    db,
  });
  assert.equal(result.customerId, "cus_from_sub_mixup");
  assert.deepEqual(created, ["cus_from_sub_mixup"]);
  assert.equal(calls[0]?.stripeCustomerId, null);
});

test("replaceStripeCustomerForUser requires an email", async () => {
  const { db } = mockDb(null);
  const { stripe } = mockStripe();
  await assert.rejects(
    replaceStripeCustomerForUser({
      user: { ...user, email: null, stripeCustomerId: null },
      stripe,
      db,
    }),
    { message: BILLING_EMAIL_REQUIRED },
  );
});

test("createProCheckoutSession opts out of Managed Payments before treating the error as a missing customer", async () => {
  const { stripe, checkoutCalls } = mockStripe({
    checkout: async (params) => {
      if (!params.managed_payments) throw taxError();
      return { url: "https://checkout.stripe.com/c/pay/cs_tax_ok" };
    },
  });
  const session = await createProCheckoutSession({
    stripe,
    customerId: "cus_live_new",
    priceId: "price_live",
    userId: "user_1",
    appUrl: "https://invoiceflowstudio.com",
    replaceCustomer: async () => {
      throw new Error("should not replace customer for a tax-code error");
    },
  });
  assert.equal(session.url, "https://checkout.stripe.com/c/pay/cs_tax_ok");
  assert.equal(checkoutCalls[0]?.managed_payments, undefined);
  assert.equal(checkoutCalls[1]?.managed_payments?.enabled, false);
});

test("createProCheckoutSession replaces a leftover customer then retries Checkout", async () => {
  let first = true;
  const { stripe, checkoutCalls } = mockStripe({
    checkout: async (params) => {
      if (first) {
        first = false;
        throw missingCustomerError(params.customer);
      }
      return { url: "https://checkout.stripe.com/c/pay/cs_retry" };
    },
  });
  const session = await createProCheckoutSession({
    stripe,
    customerId: "cus_test_leftover",
    priceId: "price_live",
    userId: "user_1",
    appUrl: "https://invoiceflowstudio.com",
    replaceCustomer: async () => ({ customerId: "cus_live_retry" }),
  });
  assert.equal(session.url, "https://checkout.stripe.com/c/pay/cs_retry");
  assert.deepEqual(
    checkoutCalls.map((call) => call.customer),
    ["cus_test_leftover", "cus_live_retry"],
  );
});

test("createProCheckoutSession can checkout again for an existing Pro customer", async () => {
  const { stripe, checkoutCalls } = mockStripe();
  const session = await createProCheckoutSession({
    stripe,
    customerId: "cus_already_pro",
    priceId: "price_live",
    userId: "user_1",
    appUrl: "https://invoiceflowstudio.com",
    replaceCustomer: async () => {
      throw new Error("existing Pro customer should not be replaced");
    },
  });
  assert.equal(session.url, "https://checkout.stripe.com/c/pay/cs_test");
  assert.equal(checkoutCalls[0]?.customer, "cus_already_pro");
});

test("createBillingPortalSession recreates a customer after a leftover test id", async () => {
  const portal = await createBillingPortalSession({
    stripe: {
      billingPortal: {
        sessions: {
          create: async ({ customer }) => {
            if (customer === "cus_test_leftover") throw missingCustomerError(customer);
            return { url: `https://billing.stripe.com/p/session/${customer}` };
          },
        },
      },
    },
    customerId: "cus_test_leftover",
    returnUrl: "https://invoiceflowstudio.com/dashboard/billing",
    replaceCustomer: async () => ({ customerId: "cus_live_portal" }),
  });
  assert.equal(portal.url, "https://billing.stripe.com/p/session/cus_live_portal");
});

test("stripeFailureMessage does not call tax or price errors leftover customers", () => {
  assert.match(stripeFailureMessage(taxError()), /tax code/);
  assert.match(
    stripeFailureMessage(Object.assign(new Error("No such price: price_missing"), { code: "resource_missing", param: "price" })),
    /price id/,
  );
  assert.match(stripeFailureMessage(missingCustomerError()), /leftover test-mode customer/);
  assert.equal(
    isMissingStripeCustomerError(
      Object.assign(new Error("The tax_code is missing for this customer"), {
        code: "resource_missing",
        param: "line_items[0]",
      }),
    ),
    false,
  );
});
