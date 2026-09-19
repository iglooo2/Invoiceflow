"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  BILLING_EMAIL_REQUIRED,
  asStripeBillingClient,
  createBillingPortalSession,
  createProCheckoutSession,
  replaceStripeCustomerForUser,
  resolveStripeCustomerForUser,
  savedStripeCustomerId,
} from "@/lib/stripe-billing";
import {
  ensureStripeProductSaaSTaxCode,
  getStripe,
  getStripeProPriceId,
  stripeEnabled,
  stripeFailureMessage,
  stripeMisconfiguredMessage,
} from "@/lib/stripe";
import { getAppUrl, isDevMode } from "@/lib/utils";

function redirectBillingError(message: string): never {
  redirect(errorRedirect("/dashboard/billing", message));
}

export async function startProCheckout() {
  try {
    const user = await requireUser();
    if (!user.email) {
      redirectBillingError(BILLING_EMAIL_REQUIRED);
    }
    const stripe = getStripe();
    const priceId = getStripeProPriceId();
    if (!stripe || !priceId || !stripeEnabled()) {
      redirectBillingError(stripeMisconfiguredMessage());
    }

    try {
      await ensureStripeProductSaaSTaxCode(stripe, priceId);
    } catch (error) {
      unstable_rethrow(error);
      console.error("ensureStripeProductSaaSTaxCode failed", safeErrorLog(error));
    }

    const billing = asStripeBillingClient(stripe);
    const resolved = await resolveStripeCustomerForUser({ user, stripe: billing, db: prisma });
    const session = await createProCheckoutSession({
      stripe: billing,
      customerId: resolved.customerId,
      priceId,
      userId: user.id,
      appUrl: getAppUrl(),
      replaceCustomer: () => replaceStripeCustomerForUser({ user, stripe: billing, db: prisma }),
    });

    if (!session.url) {
      redirectBillingError("Stripe did not return a checkout URL.");
    }
    redirect(session.url);
  } catch (error) {
    unstable_rethrow(error);
    console.error("startProCheckout failed", safeErrorLog(error));
    redirectBillingError(stripeFailureMessage(error));
  }
}

export async function openBillingPortal() {
  try {
    const user = await requireUser();
    const stripe = getStripe();
    if (!stripe || !stripeEnabled()) {
      redirectBillingError(stripeMisconfiguredMessage());
    }
    if (!user.email && !savedStripeCustomerId(user.stripeCustomerId)) {
      redirectBillingError(BILLING_EMAIL_REQUIRED);
    }
    const billing = asStripeBillingClient(stripe);
    const resolved = await resolveStripeCustomerForUser({ user, stripe: billing, db: prisma });
    const portal = await createBillingPortalSession({
      stripe: billing,
      customerId: resolved.customerId,
      returnUrl: `${getAppUrl()}/dashboard/billing`,
      replaceCustomer: () => replaceStripeCustomerForUser({ user, stripe: billing, db: prisma }),
    });
    redirect(portal.url);
  } catch (error) {
    unstable_rethrow(error);
    console.error("openBillingPortal failed", safeErrorLog(error));
    redirectBillingError(stripeFailureMessage(error));
  }
}

export async function demoUnlockPro() {
  const user = await requireUser();
  if (!isDevMode()) {
    redirectBillingError("Local demo upgrades are disabled.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "pro",
      stripeCurrentPeriodEnd: addDays(new Date(), 30),
    },
  });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/billing?status=demo");
}

export async function demoDowngrade() {
  const user = await requireUser();
  if (!isDevMode()) {
    redirectBillingError("Local demo upgrades are disabled.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "free",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/billing");
}
