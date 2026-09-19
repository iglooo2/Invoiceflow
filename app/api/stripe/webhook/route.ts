import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeErrorLog } from "@/lib/db-errors";
import { getStripe, getStripeWebhookSecret, stripeWebhookCryptoProvider } from "@/lib/stripe";
import { handleStripeWebhookEvent } from "@/lib/subscription-writes";

// OpenNext on Workers uses the default Node-compat runtime. Do not pin
// `runtime = "nodejs"` or the deprecated `"edge"` value — both can break
// this route on workerd. Signature checks must be async SubtleCrypto.

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = getStripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 501 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      stripeWebhookCryptoProvider(),
    );
  } catch (error) {
    return NextResponse.json({ error: `Invalid signature: ${(error as Error).message}` }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(prisma, stripe, event);
  } catch (error) {
    console.error("stripe webhook failed", event.type, safeErrorLog(error));
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
