import { demoDowngrade, demoUnlockPro, openBillingPortal, startProCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { planFromUser, requireUser } from "@/lib/session";
import { isDevMode, stripeEnabled } from "@/lib/utils";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const user = await requireUser();
  const plan = planFromUser(user);
  const { status, error } = await searchParams;
  const stripeReady = stripeEnabled();
  const dev = isDevMode();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-4xl">Billing</h1>
        <p className="mt-2 text-muted-foreground">
          You’re on <span className="capitalize text-foreground">{plan}</span>. Starter is limited to 3 invoices and
          3 proposals each month. Pro is ${PLANS.pro.monthlyPrice}/month, unlimited.
        </p>
      </div>
      {status === "success" ? (
        <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800">Stripe checkout completed. Refresh if the plan hasn’t flipped yet — webhooks may still be catching up.</p>
      ) : null}
      {status === "demo" ? (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">Local demo Pro unlocked for 30 days.</p>
      ) : null}
      {error === "limit" ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          Starter includes 3 invoices and 3 proposals per month. Upgrade to Pro for unlimited.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(PLANS).map((item) => (
          <div key={item.id} className="paper-card rounded-3xl p-6">
            <h2 className="font-display text-2xl">{item.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.blurb}</p>
            <ul className="mt-4 grid gap-1 text-sm">
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {stripeReady && plan !== "pro" ? (
          <form action={startProCheckout}>
            <Button type="submit">Upgrade with Stripe (test mode)</Button>
          </form>
        ) : null}
        {stripeReady && user.stripeCustomerId ? (
          <form action={openBillingPortal}>
            <Button type="submit" variant="outline">
              Stripe customer portal
            </Button>
          </form>
        ) : null}
        {dev && plan !== "pro" ? (
          <form action={demoUnlockPro}>
            <Button type="submit" variant="secondary">
              Unlock Pro for local demo
            </Button>
          </form>
        ) : null}
        {dev && plan === "pro" ? (
          <form action={demoDowngrade}>
            <Button type="submit" variant="outline">
              Return to Starter
            </Button>
          </form>
        ) : null}
      </div>

      {!stripeReady ? (
        <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Stripe isn’t wired yet — that’s expected.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Create a Stripe test product/price (~$24/month) in the Dashboard.</li>
            <li>Set STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</li>
            <li>Run <code>stripe listen --forward-to localhost:3000/api/stripe/webhook</code> and paste STRIPE_WEBHOOK_SECRET.</li>
            <li>Use card 4242 4242 4242 4242 in Checkout.</li>
          </ol>
          {dev ? <p className="mt-3">Until then, use “Unlock Pro for local demo” (AUTH_DEV_MODE=true).</p> : null}
        </div>
      ) : null}
    </div>
  );
}
