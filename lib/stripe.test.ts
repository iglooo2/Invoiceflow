import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { readCloudflareString } from "./runtime-env";
import {
  createStripeClient,
  stripeSdkOptions,
  stripeWebhookCryptoProvider,
  STRIPE_REQUEST_TIMEOUT_MS,
} from "./stripe-client";
import {
  isMissingStripeCustomerError,
  isPlaceholderStripePriceId,
  isPlaceholderStripeSecret,
  isPlaceholderStripeWebhookSecret,
  isStripeTaxCodeError,
  pickConfiguredSecret,
  readStripeProPriceId,
  readStripeSecretKey,
  stripeEnabled,
  stripeFailureMessage,
  stripeKeyMode,
  stripeMisconfiguredMessage,
  stripeUpgradeButtonLabel,
} from "./stripe-env";
import {
  STRIPE_SAAS_TAX_CODE,
  buildProCheckoutSessionParams,
  ensureStripeProductSaaSTaxCode,
  existingProductTaxCode,
  productIdFromPrice,
} from "./stripe-checkout";

test("treats .env.example Stripe placeholders as missing", () => {
  assert.equal(isPlaceholderStripeSecret(""), true);
  assert.equal(isPlaceholderStripeSecret("sk_test_..."), true);
  assert.equal(isPlaceholderStripeSecret("sk_live_..."), true);
  assert.equal(isPlaceholderStripeSecret("sk_test_51RealKey"), false);
  assert.equal(isPlaceholderStripePriceId("price_..."), true);
  assert.equal(isPlaceholderStripePriceId("price_123"), false);
  assert.equal(isPlaceholderStripeWebhookSecret("whsec_..."), true);
  assert.equal(isPlaceholderStripeWebhookSecret("whsec_abc"), false);
});

test("prefers a real Cloudflare secret over an empty or placeholder process.env", () => {
  assert.equal(
    pickConfiguredSecret("", "sk_live_from_worker", isPlaceholderStripeSecret),
    "sk_live_from_worker",
  );
  assert.equal(
    pickConfiguredSecret("sk_test_...", "sk_live_from_worker", isPlaceholderStripeSecret),
    "sk_live_from_worker",
  );
  assert.equal(
    pickConfiguredSecret("sk_test_local", "", isPlaceholderStripeSecret),
    "sk_test_local",
  );
  assert.equal(pickConfiguredSecret("sk_test_...", "", isPlaceholderStripeSecret), "");
  assert.equal(pickConfiguredSecret("", "", isPlaceholderStripeSecret), "");
});

test("stripeEnabled reads process.env when Cloudflare context is absent", () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousPrice = process.env.STRIPE_PRO_PRICE_ID;
  try {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRO_PRICE_ID;
    assert.equal(stripeEnabled(), false);

    process.env.STRIPE_SECRET_KEY = "sk_test_...";
    process.env.STRIPE_PRO_PRICE_ID = "price_...";
    assert.equal(stripeEnabled(), false);
    assert.equal(readStripeSecretKey(), "");
    assert.equal(readStripeProPriceId(), "");

    process.env.STRIPE_SECRET_KEY = "sk_test_51abc";
    process.env.STRIPE_PRO_PRICE_ID = "price_abc";
    assert.equal(stripeEnabled(), true);
    assert.equal(readStripeSecretKey(), "sk_test_51abc");
    assert.equal(readStripeProPriceId(), "price_abc");
  } finally {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousPrice === undefined) delete process.env.STRIPE_PRO_PRICE_ID;
    else process.env.STRIPE_PRO_PRICE_ID = previousPrice;
  }
});

test("stripe SDK options use the fetch HTTP client and a Workers-safe timeout", () => {
  const options = stripeSdkOptions();
  assert.equal(options.timeout, STRIPE_REQUEST_TIMEOUT_MS);
  assert.equal(options.maxNetworkRetries, 1);
  assert.equal(options.httpClient?.getClientName(), "fetch");
  assert.equal(Stripe.createFetchHttpClient().getClientName(), "fetch");
});

test("createStripeClient talks to Stripe over fetch, not node:https", async () => {
  const originalFetch = globalThis.fetch;
  let fetchUrl = "";
  globalThis.fetch = async (input, init) => {
    fetchUrl = String(input);
    assert.equal(typeof init?.method, "string");
    return new Response(JSON.stringify({ id: "cus_test", object: "customer", email: "ada@example.com" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Request-Id": "req_test",
      },
    });
  };
  try {
    const stripe = createStripeClient("sk_test_fetch_client");
    const customer = await stripe.customers.create({ email: "ada@example.com" });
    assert.equal(customer.id, "cus_test");
    assert.match(fetchUrl, /api\.stripe\.com/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stripeFailureMessage maps misconfig and API failures without leaking secrets", () => {
  assert.equal(stripeFailureMessage(new Error("Stripe is not configured")), stripeMisconfiguredMessage());
  assert.match(stripeFailureMessage(new Error("Invalid API Key provided")), /API key/);
  assert.match(stripeFailureMessage(new Error("No such price: price_missing")), /price id/);
  assert.match(
    stripeFailureMessage(Object.assign(new Error("No such customer: cus_test"), { code: "resource_missing", param: "customer" })),
    /customer/,
  );
  assert.match(stripeFailureMessage(new Error("An error occurred with our connection to Stripe")), /reach Stripe/);
  const leaked = stripeFailureMessage(new Error("postgresql://invoice:s3cret@ep-foo.neon.tech/db"));
  assert.equal(leaked.includes("s3cret"), false);
  assert.match(stripeFailureMessage(new Error("unexpected stripe boom")), /Couldn’t complete the Stripe request/);
  assert.match(
    stripeFailureMessage(
      new Error("The product tax code is missing. Managed Payments is enabled by default for this account."),
    ),
    /tax code/,
  );
});

test("isStripeTaxCodeError matches Managed Payments tax-code rejections", () => {
  assert.equal(
    isStripeTaxCodeError(new Error("The product tax code is missing. Managed Payments is enabled by default.")),
    true,
  );
  assert.equal(isStripeTaxCodeError(new Error("line_items[0]: tax_code is required")), true);
  assert.equal(isStripeTaxCodeError(new Error("No such customer: cus_test")), false);
});

test("stripeKeyMode follows secret prefix, not AUTH or publishable env", () => {
  assert.equal(stripeKeyMode("sk_test_51abc"), "test");
  assert.equal(stripeKeyMode("rk_test_restricted"), "test");
  assert.equal(stripeKeyMode("sk_live_51abc"), "live");
  assert.equal(stripeKeyMode("rk_live_restricted"), "live");
  assert.equal(stripeKeyMode("pk_live_51abc"), "live");
  assert.equal(stripeKeyMode(""), "unknown");
  assert.equal(stripeUpgradeButtonLabel("test"), "Upgrade with Stripe (test mode)");
  assert.equal(stripeUpgradeButtonLabel("live"), "Upgrade with Stripe");
  assert.equal(stripeUpgradeButtonLabel("unknown"), "Upgrade with Stripe");
});

test("billing page labels Upgrade from runtime Stripe mode, not hardcoded test copy", () => {
  const page = readFileSync(path.join(import.meta.dirname, "../app/dashboard/billing/page.tsx"), "utf8");
  assert.match(page, /stripeUpgradeButtonLabel/);
  assert.match(page, /stripeKeyMode/);
  assert.doesNotMatch(page, /<Button type="submit">Upgrade with Stripe \(test mode\)<\/Button>/);
  assert.match(page, /encrypted runtime secrets/);
  assert.doesNotMatch(page, /stripeReady && plan !== "pro"/);
  assert.match(page, /user\.stripeCustomerId \|\| plan === "pro"/);
});

test("wrangler keeps dashboard Stripe bindings and never ships a live price id", () => {
  const wrangler = readFileSync(path.join(import.meta.dirname, "../wrangler.jsonc"), "utf8");
  const readme = readFileSync(path.join(import.meta.dirname, "../README.md"), "utf8");
  const parsed = JSON.parse(wrangler.replace(/^\s*\/\/.*$/gm, "")) as {
    keep_vars?: boolean;
    vars?: Record<string, unknown>;
  };
  assert.equal(parsed.keep_vars, true);
  assert.deepEqual(Object.keys(parsed.vars ?? {}), ["NEXTJS_ENV"]);
  assert.equal(parsed.vars?.NEXTJS_ENV, "production");
  assert.doesNotMatch(wrangler, /price_1/);
  assert.match(readme, /`STRIPE_PRO_PRICE_ID` \| Secret \(\*\*runtime\*\*\)/);
  assert.doesNotMatch(readme, /`STRIPE_PRO_PRICE_ID` \| Variable/);
});

test("missing Stripe customer errors are detected for test-to-live retries", () => {
  assert.equal(isMissingStripeCustomerError(new Error("No such customer: 'cus_test123'")), true);
  assert.equal(
    isMissingStripeCustomerError(Object.assign(new Error("No such customer"), { code: "resource_missing", param: "customer" })),
    true,
  );
  assert.equal(isMissingStripeCustomerError(new Error("No such price: price_abc")), false);
  assert.equal(
    isMissingStripeCustomerError(
      Object.assign(new Error("No such payment_method for this customer"), {
        code: "resource_missing",
        param: "payment_method",
      }),
    ),
    false,
  );
  assert.equal(
    isMissingStripeCustomerError(
      Object.assign(new Error("The tax_code is missing. Managed Payments cannot create a session for this customer."), {
        code: "resource_missing",
        param: "line_items[0]",
      }),
    ),
    false,
  );
});

test("webhook signatures verify with SubtleCrypto instead of Node crypto", async () => {
  const payload = JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "ping",
    data: { object: {} },
  });
  const secret = "whsec_test_secret";
  const stripe = createStripeClient("sk_test_fetch_client");
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const event = await stripe.webhooks.constructEventAsync(
    payload,
    header,
    secret,
    undefined,
    stripeWebhookCryptoProvider(),
  );
  assert.equal(event.id, "evt_test");
});

test("checkout action retries missing customers and tax-code Managed Payments failures", () => {
  const action = readFileSync(path.join(import.meta.dirname, "../app/actions/billing.ts"), "utf8");
  assert.match(action, /resolveStripeCustomerForUser/);
  assert.match(action, /replaceStripeCustomerForUser/);
  assert.match(action, /createProCheckoutSession/);
  assert.match(action, /createBillingPortalSession/);
  assert.match(action, /if \(!user\.email\)/);
  assert.match(action, /ensureStripeProductSaaSTaxCode/);
});

test("SaaS tax helpers read product ids and only update when tax_code is missing", async () => {
  assert.equal(STRIPE_SAAS_TAX_CODE, "txcd_10103001");
  assert.equal(productIdFromPrice({ product: "prod_abc" }), "prod_abc");
  assert.equal(productIdFromPrice({ product: { id: "prod_exp" } }), "prod_exp");
  assert.equal(existingProductTaxCode({ tax_code: "txcd_10103001" }), "txcd_10103001");
  assert.equal(existingProductTaxCode({ tax_code: null }), "");

  let updatedTaxCode = "";
  const stripe = {
    prices: {
      retrieve: async () => ({ product: { id: "prod_pro", tax_code: null } }),
    },
    products: {
      update: async (_id: string, params: { tax_code: string }) => {
        updatedTaxCode = params.tax_code;
        return { id: "prod_pro", tax_code: params.tax_code };
      },
    },
  };
  const first = await ensureStripeProductSaaSTaxCode(stripe, "price_live");
  assert.equal(first.updated, true);
  assert.equal(first.taxCode, STRIPE_SAAS_TAX_CODE);
  assert.equal(updatedTaxCode, STRIPE_SAAS_TAX_CODE);

  const alreadyCoded = {
    prices: {
      retrieve: async () => ({ product: { id: "prod_pro", tax_code: "txcd_10103000" } }),
    },
    products: {
      update: async () => {
        throw new Error("should not update a product that already has a tax code");
      },
    },
  };
  const second = await ensureStripeProductSaaSTaxCode(alreadyCoded, "price_live");
  assert.equal(second.updated, false);
  assert.equal(second.taxCode, "txcd_10103000");
});

test("checkout session params omit managed_payments unless opting out", () => {
  const first = buildProCheckoutSessionParams({
    customerId: "cus_live",
    priceId: "price_live",
    userId: "user_1",
    appUrl: "https://invoiceflowstudio.com",
  });
  assert.equal(first.mode, "subscription");
  assert.equal(first.line_items?.[0]?.price, "price_live");
  assert.equal(first.metadata?.userId, "user_1");
  assert.equal(first.subscription_data?.metadata?.userId, "user_1");
  assert.equal(first.managed_payments, undefined);

  const fallback = buildProCheckoutSessionParams({
    customerId: "cus_live",
    priceId: "price_live",
    userId: "user_1",
    appUrl: "https://invoiceflowstudio.com",
    managedPaymentsEnabled: false,
  });
  assert.equal(fallback.managed_payments?.enabled, false);
});

test("webhook route stays on the default Worker runtime and verifies async", () => {
  const webhook = readFileSync(path.join(import.meta.dirname, "../app/api/stripe/webhook/route.ts"), "utf8");
  assert.doesNotMatch(webhook, /export const runtime/);
  assert.match(webhook, /constructEventAsync/);
  assert.match(webhook, /stripeWebhookCryptoProvider/);
  assert.match(webhook, /handleStripeWebhookEvent/);
  assert.doesNotMatch(webhook, /\$transaction/);
  assert.doesNotMatch(webhook, /updateMany/);
});

test("readCloudflareString is empty outside a Worker request", () => {
  assert.equal(readCloudflareString("STRIPE_SECRET_KEY"), "");
  assert.equal(readCloudflareString("DATABASE_URL"), "");
});
