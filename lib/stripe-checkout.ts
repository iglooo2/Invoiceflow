import type Stripe from "stripe";

/**
 * Stripe tax category: Software as a service (SaaS) — business use.
 * Eligible for Managed Payments. InvoiceFlow Pro is a studio subscription.
 * @see https://docs.stripe.com/payments/managed-payments/eligibility
 */
export const STRIPE_SAAS_TAX_CODE = "txcd_10103001";

export type StripeTaxClient = {
  prices: {
    retrieve: (
      id: string,
      params: { expand: string[] },
    ) => Promise<{ product?: unknown }>;
  };
  products: {
    update: (id: string, params: { tax_code: string }) => Promise<{ id: string; tax_code?: unknown }>;
  };
};

export function productIdFromPrice(price: { product?: unknown }): string {
  const product = price.product;
  if (typeof product === "string" && product.startsWith("prod_")) return product;
  if (product && typeof product === "object" && "id" in product) {
    const id = (product as { id?: unknown }).id;
    if (typeof id === "string" && id.startsWith("prod_")) return id;
  }
  return "";
}

export function existingProductTaxCode(product: unknown): string {
  if (!product || typeof product === "string") return "";
  const code = (product as { tax_code?: unknown }).tax_code;
  if (typeof code === "string" && code.startsWith("txcd_")) return code;
  if (code && typeof code === "object" && "id" in code) {
    const id = (code as { id?: unknown }).id;
    if (typeof id === "string" && id.startsWith("txcd_")) return id;
  }
  return "";
}

export function buildProCheckoutSessionParams(input: {
  customerId: string;
  priceId: string;
  userId: string;
  appUrl: string;
  managedPaymentsEnabled?: boolean;
}): Stripe.Checkout.SessionCreateParams {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.appUrl}/dashboard/billing?status=success`,
    cancel_url: `${input.appUrl}/dashboard/billing?status=cancelled`,
    allow_promotion_codes: true,
    metadata: { userId: input.userId },
    subscription_data: { metadata: { userId: input.userId } },
  };
  if (input.managedPaymentsEnabled === false) {
    params.managed_payments = { enabled: false };
  }
  return params;
}

/**
 * Managed Payments (on by default for many live accounts) rejects Checkout
 * when the Price's Product has no tax code. Write the SaaS business code
 * onto the existing product so we keep STRIPE_PRO_PRICE_ID.
 */
export async function ensureStripeProductSaaSTaxCode(stripe: StripeTaxClient, priceId: string) {
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const productId = productIdFromPrice(price);
  if (!productId) {
    throw new Error("Stripe price is missing a product");
  }
  const current = existingProductTaxCode(price.product);
  if (current) {
    return { productId, taxCode: current, updated: false };
  }
  await stripe.products.update(productId, { tax_code: STRIPE_SAAS_TAX_CODE });
  return { productId, taxCode: STRIPE_SAAS_TAX_CODE, updated: true };
}
