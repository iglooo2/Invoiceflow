import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || secret === "whsec_...") {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 501 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    return NextResponse.json({ error: `Invalid signature: ${(error as Error).message}` }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    await syncSubscription(stripe, object);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = String(subscription.customer);
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan: "free",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(
  stripe: Stripe,
  object: Stripe.Checkout.Session | Stripe.Subscription,
) {
  let subscription: Stripe.Subscription | null = null;
  let customerId: string | null = null;
  let userId: string | undefined;

  if (object.object === "checkout.session") {
    customerId = String(object.customer || "");
    userId = object.metadata?.userId;
    if (object.subscription) {
      subscription = await stripe.subscriptions.retrieve(String(object.subscription));
    }
  } else {
    subscription = object;
    customerId = String(object.customer);
    userId = object.metadata?.userId;
  }

  if (!subscription || !customerId) return;

  const periodEndUnix = subscription.items.data[0]?.current_period_end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
  const priceId = subscription.items.data[0]?.price?.id;
  const active =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";

  const data = {
    plan: active ? "pro" : "free",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: periodEnd,
  };

  if (userId) {
    await prisma.user.update({ where: { id: userId }, data });
    return;
  }

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data,
  });
}
