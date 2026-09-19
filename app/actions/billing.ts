"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  buildProCheckoutSessionParams,
  ensureStripeProductSaaSTaxCode,
  getStripe,
  getStripeProPriceId,
  isMissingStripeCustomerError,
  isStripeTaxCodeError,
  stripeEnabled,
  stripeFailureMessage,
  stripeMisconfiguredMessage,
} from "@/lib/stripe";
import { getAppUrl, isDevMode } from "@/lib/utils";

function redirectBillingError(message: string): never {
  redirect(errorRedirect("/dashboard/billing", message));
}

async function createStripeCustomerForUser(user: {
  id: string;
  email: string;
  name?: string | null;
  businessName?: string | null;
}) {
  const stripe = getStripe();
  if (!stripe) {
    redirectBillingError(stripeMisconfiguredMessage());
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.businessName || user.name || undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function startProCheckout() {
  try {
    const user = await requireUser();
    if (!user.email) {
      redirectBillingError("Your account needs an email address to subscribe.");
    }
    const stripe = getStripe();
    const priceId = getStripeProPriceId();
    if (!stripe || !priceId || !stripeEnabled()) {
      redirectBillingError(stripeMisconfiguredMessage());
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomerForUser(user);
    }

    try {
      await ensureStripeProductSaaSTaxCode(stripe, priceId);
    } catch (error) {
      unstable_rethrow(error);
      console.error("ensureStripeProductSaaSTaxCode failed", safeErrorLog(error));
    }

    const createSession = (customer: string, managedPaymentsEnabled?: boolean) =>
      stripe.checkout.sessions.create(
        buildProCheckoutSessionParams({
          customerId: customer,
          priceId,
          userId: user.id,
          appUrl: getAppUrl(),
          managedPaymentsEnabled,
        }),
      );

    let session;
    try {
      session = await createSession(customerId);
    } catch (error) {
      unstable_rethrow(error);
      // Test-mode cus_… ids are invisible to live keys (and the reverse).
      if (customerId && isMissingStripeCustomerError(error)) {
        customerId = await createStripeCustomerForUser(user);
        try {
          session = await createSession(customerId);
        } catch (retryError) {
          unstable_rethrow(retryError);
          if (!isStripeTaxCodeError(retryError)) throw retryError;
          session = await createSession(customerId, false);
        }
      } else if (isStripeTaxCodeError(error)) {
        // Account default is Managed Payments; session can opt out if tax still fails.
        session = await createSession(customerId, false);
      } else {
        throw error;
      }
    }

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
    if (!stripe || !user.stripeCustomerId) {
      redirectBillingError("No Stripe customer is on file yet. Upgrade once before opening the customer portal.");
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/dashboard/billing`,
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
