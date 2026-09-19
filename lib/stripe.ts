import "server-only";
import { createStripeClient } from "./stripe-client";
import { readStripeProPriceId, readStripeSecretKey, readStripeWebhookSecret } from "./stripe-env";

export {
  isMissingStripeCustomerError,
  stripeEnabled,
  stripeFailureMessage,
  stripeKeyMode,
  stripeMisconfiguredMessage,
  stripeUpgradeButtonLabel,
  readStripeProPriceId,
  readStripeSecretKey,
  readStripeWebhookSecret,
} from "./stripe-env";
export { createStripeClient, stripeWebhookCryptoProvider } from "./stripe-client";

let stripeClient: ReturnType<typeof createStripeClient> | null = null;
let stripeClientKey: string | null = null;

export function getStripe() {
  const key = readStripeSecretKey();
  if (!key) return null;
  if (!stripeClient || stripeClientKey !== key) {
    stripeClient = createStripeClient(key);
    stripeClientKey = key;
  }
  return stripeClient;
}

export function getStripeProPriceId() {
  return readStripeProPriceId() || null;
}

export function getStripeWebhookSecret() {
  return readStripeWebhookSecret() || null;
}
