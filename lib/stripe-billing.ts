import { stripeId } from "./subscription-writes";
import { isMissingStripeCustomerError, isStripeTaxCodeError } from "./stripe-env";
import { buildProCheckoutSessionParams } from "./stripe-checkout";

export const BILLING_EMAIL_REQUIRED = "Your account needs an email address to subscribe.";

export type BillingUser = {
  id: string;
  email: string | null;
  name?: string | null;
  businessName?: string | null;
  stripeCustomerId?: string | null;
};

export type BillingUserStore = {
  user: {
    update: (args: {
      where: { id: string };
      data: { stripeCustomerId: string | null };
    }) => Promise<unknown>;
  };
};

export type StripeBillingCustomer = { id?: string | null; deleted?: unknown };

export type StripeBillingClient = {
  customers: {
    retrieve: (id: string) => Promise<StripeBillingCustomer>;
    list: (params: { email: string; limit: number }) => Promise<{ data: StripeBillingCustomer[] }>;
    create: (params: {
      email: string;
      name?: string;
      metadata?: { userId: string };
    }) => Promise<StripeBillingCustomer>;
  };
  checkout: {
    sessions: {
      create: (params: ReturnType<typeof buildProCheckoutSessionParams>) => Promise<{ url?: string | null }>;
    };
  };
  billingPortal: {
    sessions: {
      create: (params: { customer: string; return_url: string }) => Promise<{ url: string }>;
    };
  };
};

/** Real Stripe SDK objects are wider than the test double. */
export function asStripeBillingClient(stripe: object): StripeBillingClient {
  return stripe as StripeBillingClient;
}

export function savedStripeCustomerId(value: unknown): string | null {
  const id = stripeId(value);
  return id?.startsWith("cus_") ? id : null;
}

export function isUsableStripeCustomer(
  customer: StripeBillingCustomer | null | undefined,
): customer is StripeBillingCustomer & { id: string } {
  return Boolean(typeof customer?.id === "string" && customer.id.startsWith("cus_") && !customer.deleted);
}

async function saveCustomerId(db: BillingUserStore, userId: string, stripeCustomerId: string | null) {
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId },
  });
}

async function createStripeCustomer(
  user: BillingUser,
  stripe: StripeBillingClient,
  db: BillingUserStore,
) {
  if (!user.email) {
    throw new Error(BILLING_EMAIL_REQUIRED);
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.businessName || user.name || undefined,
    metadata: { userId: user.id },
  });
  if (!isUsableStripeCustomer(customer)) {
    throw new Error("Stripe did not return a customer id.");
  }
  await saveCustomerId(db, user.id, customer.id);
  return customer.id;
}

async function findCustomerByEmail(user: BillingUser, stripe: StripeBillingClient) {
  if (!user.email) return null;
  const listed = await stripe.customers.list({ email: user.email, limit: 1 });
  const match = listed.data.find(isUsableStripeCustomer);
  return match?.id ?? null;
}

/**
 * Drop leftover test-mode / deleted / non-cus_ ids before creating a new
 * customer so a retry cannot reuse the stale value (unique column + next click).
 */
export async function clearSavedStripeCustomer(db: BillingUserStore, userId: string) {
  await saveCustomerId(db, userId, null);
}

export async function replaceStripeCustomerForUser(input: {
  user: BillingUser;
  stripe: StripeBillingClient;
  db: BillingUserStore;
}) {
  await clearSavedStripeCustomer(input.db, input.user.id);
  try {
    const existing = await findCustomerByEmail(input.user, input.stripe);
    if (existing) {
      await saveCustomerId(input.db, input.user.id, existing);
      return { customerId: existing, created: false as const, replaced: true as const };
    }
  } catch {
    // Listing is best-effort; creating a customer still unblocks Upgrade.
  }
  const customerId = await createStripeCustomer(input.user, input.stripe, input.db);
  return { customerId, created: true as const, replaced: true as const };
}

/**
 * Use a saved cus_ only after Stripe retrieve succeeds in this key mode.
 * NULL, "null", sub_ leftovers, deleted customers, and wrong-mode cus_ ids
 * are cleared and replaced (reuse Live customer with the same email when possible).
 */
export async function resolveStripeCustomerForUser(input: {
  user: BillingUser;
  stripe: StripeBillingClient;
  db: BillingUserStore;
}) {
  const saved = savedStripeCustomerId(input.user.stripeCustomerId);
  if (saved) {
    try {
      const customer = await input.stripe.customers.retrieve(saved);
      if (isUsableStripeCustomer(customer)) {
        return { customerId: customer.id, created: false as const, replaced: false as const };
      }
    } catch (error) {
      if (!isMissingStripeCustomerError(error)) throw error;
    }
  } else if (!input.user.stripeCustomerId) {
    try {
      const existing = await findCustomerByEmail(input.user, input.stripe);
      if (existing) {
        await saveCustomerId(input.db, input.user.id, existing);
        return { customerId: existing, created: false as const, replaced: false as const };
      }
    } catch {
      // Fall through to create.
    }
    const customerId = await createStripeCustomer(input.user, input.stripe, input.db);
    return { customerId, created: true as const, replaced: false as const };
  }

  return replaceStripeCustomerForUser(input);
}

export async function createProCheckoutSession(input: {
  stripe: StripeBillingClient;
  customerId: string;
  priceId: string;
  userId: string;
  appUrl: string;
  replaceCustomer: () => Promise<{ customerId: string }>;
}) {
  const createSession = (customerId: string, managedPaymentsEnabled?: boolean) =>
    input.stripe.checkout.sessions.create(
      buildProCheckoutSessionParams({
        customerId,
        priceId: input.priceId,
        userId: input.userId,
        appUrl: input.appUrl,
        managedPaymentsEnabled,
      }),
    );

  let customerId = input.customerId;
  try {
    return await createSession(customerId);
  } catch (error) {
    if (isStripeTaxCodeError(error)) {
      return createSession(customerId, false);
    }
    if (!isMissingStripeCustomerError(error)) throw error;

    const replaced = await input.replaceCustomer();
    customerId = replaced.customerId;
    try {
      return await createSession(customerId);
    } catch (retryError) {
      if (isStripeTaxCodeError(retryError)) {
        return createSession(customerId, false);
      }
      throw retryError;
    }
  }
}

export async function createBillingPortalSession(input: {
  stripe: StripeBillingClient;
  customerId: string;
  returnUrl: string;
  replaceCustomer: () => Promise<{ customerId: string }>;
}) {
  try {
    return await input.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
  } catch (error) {
    if (!isMissingStripeCustomerError(error)) throw error;
    const replaced = await input.replaceCustomer();
    return input.stripe.billingPortal.sessions.create({
      customer: replaced.customerId,
      return_url: input.returnUrl,
    });
  }
}
