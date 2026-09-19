import type { PrismaClient } from "@prisma/client";

/**
 * Neon HTTP (`PrismaNeonHTTP`) rejects `startTransaction()`. Prisma's query
 * compiler still wraps `updateMany` / `createMany` in an internal transaction
 * even when they compile to one SQL statement, which 500s the Worker:
 *
 *   Error: Transactions are not supported in HTTP mode
 *     at PrismaNeonHTTPAdapter.startTransaction
 *
 * `user.update` (single-row) and `findUnique` do not start a transaction —
 * same pattern as checkout.session.completed, which already returned 200.
 * Subscription / invoice events must use find-then-update, never updateMany.
 */
export type SubscriptionUserStore = Pick<PrismaClient, "user">;

export type SubscriptionPlanAction = "pro" | "free" | "keep";

export type SubscriptionWriteInput = {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
  periodEnd?: Date | null;
  plan: SubscriptionPlanAction;
};

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);
const KEEP_PLAN_STATUSES = new Set(["incomplete"]);

export function stripeId(value: unknown): string | null {
  if (typeof value === "string") {
    const id = value.trim();
    return id && id !== "null" && id !== "undefined" && !id.startsWith("[object ") ? id : null;
  }
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? stripeId(id) : null;
  }
  return null;
}

export function unixToDate(unix: unknown): Date | null {
  if (typeof unix !== "number" || !Number.isFinite(unix) || unix <= 0) return null;
  const date = new Date(unix * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function planActionFromStatus(status: string | null | undefined): SubscriptionPlanAction {
  if (!status) return "keep";
  if (PAID_STATUSES.has(status)) return "pro";
  if (KEEP_PLAN_STATUSES.has(status)) return "keep";
  return "free";
}

function priceIdFromItem(item: { price?: unknown } | undefined): string | null {
  const price = item?.price;
  if (typeof price === "string" && price.startsWith("price_")) return price;
  if (price && typeof price === "object" && "id" in price) {
    const id = (price as { id?: unknown }).id;
    if (typeof id === "string" && id.startsWith("price_")) return id;
  }
  return null;
}

type SubscriptionLike = {
  id?: unknown;
  status?: unknown;
  customer?: unknown;
  metadata?: { userId?: unknown } | null;
  current_period_end?: unknown;
  items?: { data?: Array<{ current_period_end?: unknown; price?: unknown }> } | null;
};

export function subscriptionPeriodEnd(subscription: SubscriptionLike): Date | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  const fromRoot = subscription.current_period_end;
  return unixToDate(fromItem) ?? unixToDate(fromRoot);
}

export function subscriptionPriceId(subscription: SubscriptionLike): string | null {
  return priceIdFromItem(subscription.items?.data?.[0]);
}

export function subscriptionWriteFromStripe(
  object: unknown,
  extras?: { userId?: string | null; customerId?: string | null },
): SubscriptionWriteInput | null {
  if (!object || typeof object !== "object") return null;
  const subscription = object as SubscriptionLike;
  const userId =
    extras?.userId ??
    (typeof subscription.metadata?.userId === "string" ? subscription.metadata.userId : null);
  const customerId = extras?.customerId ?? stripeId(subscription.customer);
  const subscriptionId = stripeId(subscription.id);
  if (!userId && !customerId && !subscriptionId) return null;
  return {
    userId,
    customerId,
    subscriptionId,
    priceId: subscriptionPriceId(subscription),
    periodEnd: subscriptionPeriodEnd(subscription),
    plan: planActionFromStatus(typeof subscription.status === "string" ? subscription.status : null),
  };
}

type InvoiceLike = {
  customer?: unknown;
  subscription?: unknown;
  period_end?: unknown;
  metadata?: { userId?: unknown } | null;
  parent?: { subscription_details?: { subscription?: unknown } | null } | null;
  lines?: {
    data?: Array<{
      period?: { end?: unknown } | null;
      pricing?: { price_details?: { price?: unknown } | null } | null;
      price?: unknown;
    }>;
  } | null;
};

export function invoiceSubscriptionId(invoice: InvoiceLike): string | null {
  return (
    stripeId(invoice.subscription) ?? stripeId(invoice.parent?.subscription_details?.subscription)
  );
}

export function subscriptionWriteFromInvoice(object: unknown): SubscriptionWriteInput | null {
  if (!object || typeof object !== "object") return null;
  const invoice = object as InvoiceLike;
  const line = invoice.lines?.data?.[0];
  const customerId = stripeId(invoice.customer);
  const subscriptionId = invoiceSubscriptionId(invoice);
  const userId = typeof invoice.metadata?.userId === "string" ? invoice.metadata.userId : null;
  if (!userId && !customerId && !subscriptionId) return null;
  const periodEnd = unixToDate(line?.period?.end) ?? unixToDate(invoice.period_end);
  const priceFromDetails = stripeId(line?.pricing?.price_details?.price);
  return {
    userId,
    customerId,
    subscriptionId,
    priceId: priceIdFromItem(line) ?? (priceFromDetails?.startsWith("price_") ? priceFromDetails : null),
    periodEnd,
    plan: "pro",
  };
}

async function findUserId(
  db: SubscriptionUserStore,
  input: Pick<SubscriptionWriteInput, "userId" | "customerId" | "subscriptionId">,
): Promise<string | null> {
  if (input.customerId) {
    const byCustomer = await db.user.findUnique({
      where: { stripeCustomerId: input.customerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;
  }
  if (input.subscriptionId) {
    const bySubscription = await db.user.findUnique({
      where: { stripeSubscriptionId: input.subscriptionId },
      select: { id: true },
    });
    if (bySubscription) return bySubscription.id;
  }
  if (input.userId) {
    const byId = await db.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }
  return null;
}

function isPrismaCode(error: unknown, code: string) {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === code,
  );
}

function userUpdateData(input: SubscriptionWriteInput) {
  const data: {
    plan?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
  } = {};
  if (input.plan !== "keep") data.plan = input.plan;
  if (input.customerId) data.stripeCustomerId = input.customerId;
  if (input.subscriptionId) data.stripeSubscriptionId = input.subscriptionId;
  if (input.priceId) data.stripePriceId = input.priceId;
  if (input.periodEnd) data.stripeCurrentPeriodEnd = input.periodEnd;
  return data;
}

/**
 * One find + one `user.update`. Never `$transaction`, nested writes, or
 * `updateMany` (the last still starts a transaction on Prisma 6 + Neon HTTP).
 */
export async function applySubscriptionWrite(db: SubscriptionUserStore, input: SubscriptionWriteInput | null) {
  if (!input) return { updated: false as const };
  const userId = await findUserId(db, input);
  if (!userId) return { updated: false as const };

  const data = userUpdateData(input);
  if (Object.keys(data).length === 0) return { updated: false as const };

  try {
    await db.user.update({ where: { id: userId }, data });
    return { updated: true as const, userId };
  } catch (error) {
    if (isPrismaCode(error, "P2025")) return { updated: false as const };
    if (isPrismaCode(error, "P2002")) {
      const { stripeCustomerId: _customer, stripeSubscriptionId: _subscription, ...scalars } = data;
      if (Object.keys(scalars).length === 0) return { updated: false as const };
      await db.user.update({ where: { id: userId }, data: scalars });
      return { updated: true as const, userId };
    }
    throw error;
  }
}

export async function clearSubscriptionWrite(
  db: SubscriptionUserStore,
  ids: { customerId?: string | null; subscriptionId?: string | null },
) {
  const userId = await findUserId(db, ids);
  if (!userId) return { updated: false as const };

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        plan: "free",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    });
    return { updated: true as const, userId };
  } catch (error) {
    if (isPrismaCode(error, "P2025")) return { updated: false as const };
    throw error;
  }
}

type StripeSubscriptionReader = {
  subscriptions: {
    retrieve: (id: string) => Promise<unknown>;
  };
};

export async function syncCheckoutCompleted(
  db: SubscriptionUserStore,
  stripe: StripeSubscriptionReader,
  session: unknown,
) {
  if (!session || typeof session !== "object") return { updated: false as const };
  const object = session as {
    customer?: unknown;
    subscription?: unknown;
    metadata?: { userId?: unknown } | null;
  };
  const customerId = stripeId(object.customer);
  const userId = typeof object.metadata?.userId === "string" ? object.metadata.userId : null;
  const subscriptionId = stripeId(object.subscription);

  let subscription: unknown = null;
  if (object.subscription && typeof object.subscription === "object" && "status" in object.subscription) {
    subscription = object.subscription;
  } else if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  if (subscription) {
    return applySubscriptionWrite(db, subscriptionWriteFromStripe(subscription, { userId, customerId }));
  }
  if (!subscriptionId && !customerId && !userId) return { updated: false as const };
  return applySubscriptionWrite(db, {
    userId,
    customerId,
    subscriptionId,
    plan: "pro",
  });
}

export async function handleStripeWebhookEvent(
  db: SubscriptionUserStore,
  stripe: StripeSubscriptionReader,
  event: { type: string; data: { object: unknown } },
) {
  switch (event.type) {
    case "checkout.session.completed":
      return syncCheckoutCompleted(db, stripe, event.data.object);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return applySubscriptionWrite(db, subscriptionWriteFromStripe(event.data.object));
    case "customer.subscription.deleted": {
      const object = event.data.object as { id?: unknown; customer?: unknown };
      return clearSubscriptionWrite(db, {
        customerId: stripeId(object.customer),
        subscriptionId: stripeId(object.id),
      });
    }
    case "invoice.paid":
      return applySubscriptionWrite(db, subscriptionWriteFromInvoice(event.data.object));
    default:
      return { updated: false as const };
  }
}
