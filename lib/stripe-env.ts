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

export function stripeMisconfiguredMessage() {
  return "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID as Cloudflare Worker secrets (not only build variables), then redeploy.";
}

export function stripeFailureMessage(error: unknown) {
  const log = safeErrorLog(error);
  const blob = `${log.name} ${log.code ?? ""} ${log.message}`.toLowerCase();
  if (blob.includes("not configured") || blob.includes("sk_test_...") || blob.includes("price_...")) {
    return stripeMisconfiguredMessage();
  }
  if (blob.includes("invalid api key") || blob.includes("invalid_api_key") || blob.includes("no api key provided")) {
    return "Stripe rejected the API key. Check STRIPE_SECRET_KEY on the Worker, then retry.";
  }
  if (blob.includes("no such price") || blob.includes("resource_missing")) {
    return "Stripe price id is missing or invalid. Check STRIPE_PRO_PRICE_ID on the Worker.";
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
