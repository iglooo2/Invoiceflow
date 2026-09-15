"use server";

import { addDays } from "date-fns";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getStripe, getStripeProPriceId } from "@/lib/stripe";
import { getAppUrl, isDevMode, stripeEnabled } from "@/lib/utils";

export async function startProCheckout() {
  const user = await requireUser();
  if (!user.email) {
    throw new Error("Your account needs an email address to subscribe.");
  }
  const stripe = getStripe();
  const priceId = getStripeProPriceId();
  if (!stripe || !priceId || !stripeEnabled()) {
    throw new Error("Stripe is not configured. Add test-mode keys or use the local demo upgrade.");
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

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

export async function openBillingPortal() {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe || !user.stripeCustomerId) {
    throw new Error("No Stripe customer is on file yet.");
  }
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard/billing`,
  });
  redirect(portal.url);
}

export async function demoUnlockPro() {
  const user = await requireUser();
  if (!isDevMode()) {
    throw new Error("Local demo upgrades are disabled.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "pro",
      stripeCurrentPeriodEnd: addDays(new Date(), 30),
    },
  });
  redirect("/dashboard/billing?status=demo");
}

export async function demoDowngrade() {
  const user = await requireUser();
  if (!isDevMode()) {
    throw new Error("Local demo upgrades are disabled.");
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
  redirect("/dashboard/billing");
}
