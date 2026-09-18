import Stripe from "stripe";

/** Fail before Cloudflare hung-worker cancellation (~30s) if Stripe is unreachable. */
export const STRIPE_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Stripe's default `node:https` client hangs on workerd (no response, platform
 * cancels the Worker). Fetch is the supported HTTP client on Cloudflare.
 * @see https://opennext.js.org/cloudflare/howtos/stripeAPI
 */
export function stripeSdkOptions(): Stripe.StripeConfig {
  return {
    httpClient: Stripe.createFetchHttpClient(),
    timeout: STRIPE_REQUEST_TIMEOUT_MS,
    maxNetworkRetries: 1,
  };
}

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, stripeSdkOptions());
}

export function stripeWebhookCryptoProvider() {
  return Stripe.createSubtleCryptoProvider();
}
