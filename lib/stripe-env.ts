import { safeErrorLog } from "./db-errors";
import { readCloudflareString } from "./runtime-env";

export function isPlaceholderStripeSecret(value: string) {
  const key = value.trim();
  return !key || key.includes("sk_test_...") || key.includes("sk_live_...");
}

export function isPlaceholderStripePriceId(value: string) {
  const id = value.trim();
  return !id || id === "price_...";
}

export function isPlaceholderStripeWebhookSecret(value: string) {
  const secret = value.trim();
  return !secret || secret === "whsec_...";
}

/**
 * Prefer a real Cloudflare runtime secret over `process.env`, which Next.js
 * may have inlined as empty or as a `.env.example` placeholder at build time.
 */
export function pickConfiguredSecret(
  fromProcess: string,
  fromCloudflare: string,
  isPlaceholder: (value: string) => boolean,
) {
  const cloudflare = fromCloudflare.trim();
  const processValue = fromProcess.trim();
  if (cloudflare && !isPlaceholder(cloudflare)) return cloudflare;
  if (processValue && !isPlaceholder(processValue)) return processValue;
  return "";
}

function readStripeValue(
  name: "STRIPE_SECRET_KEY" | "STRIPE_PRO_PRICE_ID" | "STRIPE_WEBHOOK_SECRET",
  isPlaceholder: (value: string) => boolean,
) {
  return pickConfiguredSecret(process.env[name] ?? "", readCloudflareString(name), isPlaceholder);
}

export function readStripeSecretKey() {
  return readStripeValue("STRIPE_SECRET_KEY", isPlaceholderStripeSecret);
}

export function readStripeProPriceId() {
  return readStripeValue("STRIPE_PRO_PRICE_ID", isPlaceholderStripePriceId);
}

export function readStripeWebhookSecret() {
  return readStripeValue("STRIPE_WEBHOOK_SECRET", isPlaceholderStripeWebhookSecret);
}

export function stripeEnabled() {
  return Boolean(readStripeSecretKey() && readStripeProPriceId());
}

export type StripeKeyMode = "test" | "live" | "unknown";

/**
 * Test vs live is the Stripe secret prefix (`sk_` / restricted `rk_`).
 * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and AUTH_* are not consulted — Checkout
 * is server-side and never loads Stripe.js.
 */
export function stripeKeyMode(key = readStripeSecretKey()): StripeKeyMode {
  const k = key.trim();
  if (/^(sk|rk|pk)_test_/.test(k)) return "test";
  if (/^(sk|rk|pk)_live_/.test(k)) return "live";
  return "unknown";
}

export function stripeUpgradeButtonLabel(mode = stripeKeyMode()) {
  return mode === "test" ? "Upgrade with Stripe (test mode)" : "Upgrade with Stripe";
}

export function stripeMisconfiguredMessage() {
  return "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID as Cloudflare Worker secrets (not only build variables), then redeploy.";
}

export function stripeErrorBlob(error: unknown) {
  const log = safeErrorLog(error);
  const param = String((error as { param?: unknown })?.param ?? "");
  return `${log.name} ${log.code ?? ""} ${log.message} ${param}`.toLowerCase();
}

export function isMissingStripeCustomerError(error: unknown) {
  const blob = stripeErrorBlob(error);
  return blob.includes("no such customer") || (blob.includes("resource_missing") && blob.includes("customer"));
}

export function isMissingStripePriceError(error: unknown) {
  const blob = stripeErrorBlob(error);
  return blob.includes("no such price") || (blob.includes("resource_missing") && blob.includes("price"));
}

export function isStripeTaxCodeError(error: unknown) {
  const blob = stripeErrorBlob(error);
  return (
    blob.includes("tax_code") ||
    blob.includes("tax code") ||
    blob.includes("product tax") ||
    blob.includes("managed payments")
  );
}

export function stripeFailureMessage(error: unknown) {
  const log = safeErrorLog(error);
  const blob = stripeErrorBlob(error);
  if (blob.includes("not configured") || blob.includes("sk_test_...") || blob.includes("price_...")) {
    return stripeMisconfiguredMessage();
  }
  if (blob.includes("invalid api key") || blob.includes("invalid_api_key") || blob.includes("no api key provided")) {
    return "Stripe rejected the API key. Check STRIPE_SECRET_KEY on the Worker, then retry.";
  }
  if (isStripeTaxCodeError(error)) {
    return "Stripe rejected Checkout because the product is missing a tax code (Managed Payments). Retry upgrade — we assign the SaaS business tax code automatically, or Checkout continues without Managed Payments.";
  }
  if (isMissingStripeCustomerError(error)) {
    return "The saved Stripe customer id is missing in this mode (often a leftover test-mode customer after switching to live keys). Retry upgrade to create a new customer.";
  }
  if (isMissingStripePriceError(error) || blob.includes("resource_missing")) {
    return "Stripe price id is missing or invalid. Use a price created in the same mode as STRIPE_SECRET_KEY (Live Dashboard → price_… with sk_live_).";
  }
  if (blob.includes("does not have the required permissions") || blob.includes("restricted key")) {
    return "This Stripe key is missing Checkout permissions. Use sk_live_ / sk_test_ or a restricted key that can create customers and Checkout sessions.";
  }
  if (
    blob.includes("connection to stripe") ||
    blob.includes("timed out") ||
    blob.includes("timeout") ||
    blob.includes("network") ||
    blob.includes("fetch failed")
  ) {
    return "Couldn’t reach Stripe. Try again in a moment. If this keeps happening, the Worker cannot call api.stripe.com.";
  }
  const detail = [log.name, log.code].filter(Boolean).join(" ");
  return `Couldn’t complete the Stripe request (${detail || "error"}). Check Worker logs.`;
}
