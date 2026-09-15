import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("sk_test_...")) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripeProPriceId() {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id || id === "price_...") return null;
  return id;
}
