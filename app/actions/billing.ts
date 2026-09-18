"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
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
      redirectBillingError("Your account needs an email address to subscribe.");
    }
    const stripe = getStripe();
    const priceId = getStripeProPriceId();
    if (!stripe || !priceId || !stripeEnabled()) {
      redirectBillingError(stripeMisconfiguredMessage());
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.businessName || user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/dashboard/billing?status=success`,
      cancel_url: `${getAppUrl()}/dashboard/billing?status=cancelled`,
      allow_promotion_codes: true,
      metadata: { userId: user.id },
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
