import { demoDowngrade, demoUnlockPro, openBillingPortal, startProCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { planFromUser, requireUser } from "@/lib/session";
import { stripeEnabled, stripeKeyMode, stripeUpgradeButtonLabel } from "@/lib/stripe";
import { isDevMode } from "@/lib/utils";
import { appCopy } from "@/lib/i18n-request";
import { formatMessage } from "@/lib/i18n";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const user = await requireUser();
  const plan = planFromUser(user);
  const { dict } = await appCopy();
  const { status, error } = await searchParams;
  const stripeReady = stripeEnabled();
  const stripeMode = stripeKeyMode();
  const dev = isDevMode();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-4xl">{dict.app.billing}</h1>
        <p className="mt-2 text-muted-foreground">
          {formatMessage(dict.app.billingPage.lede, {
            plan: plan === "pro" ? dict.plans.pro.name : dict.plans.free.name,
            price: PLANS.pro.monthlyPrice,
          })}
        </p>
      </div>
      {status === "success" ? (
        <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{dict.app.billingPage.success}</p>
      ) : null}
      {status === "demo" ? (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">{dict.app.billingPage.demo}</p>
      ) : null}
      {error === "limit" ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          {dict.app.billingPage.limit}
        </p>
      ) : error ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(PLANS).map((item) => (
          <div key={item.id} className="paper-card rounded-3xl p-6">
            <h2 className="font-display text-2xl">{dict.plans[item.id].name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{dict.plans[item.id].blurb}</p>
            <ul className="mt-4 grid gap-1 text-sm">
              {dict.plans[item.id].features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="btn-row">
        {stripeReady ? (
          <form action={startProCheckout}>
            <Button type="submit">{stripeUpgradeButtonLabel(stripeMode)}</Button>
          </form>
        ) : null}
        {stripeReady && (user.stripeCustomerId || plan === "pro") ? (
          <form action={openBillingPortal}>
            <Button type="submit" variant="outline">
              {dict.app.billingPage.portal}
            </Button>
          </form>
        ) : null}
        {dev && plan !== "pro" ? (
          <form action={demoUnlockPro}>
            <Button type="submit" variant="secondary">
              {dict.app.billingPage.unlockDemo}
            </Button>
          </form>
        ) : null}
        {dev && plan === "pro" ? (
          <form action={demoDowngrade}>
            <Button type="submit" variant="outline">
              {dict.app.billingPage.returnStarter}
            </Button>
          </form>
        ) : null}
      </div>

      {stripeReady && stripeMode === "test" ? (
        <p className="text-sm text-muted-foreground">
          Stripe is using test-mode keys (<code>sk_test_</code>). Live Checkout needs a{" "}
          <code>sk_live_</code> secret and a Live-mode <code>price_…</code> as Worker{" "}
          <strong>runtime</strong> secrets. The publishable key is not used for this Checkout.
        </p>
      ) : null}

      {!stripeReady ? (
        <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Stripe isn’t wired yet — that’s expected.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Create a Stripe product/price (~$24/month) in the same mode as your secret key.</li>
            <li>
              Set <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_PRO_PRICE_ID</code> as Cloudflare Worker
              encrypted runtime secrets (not plaintext Variables or build-only vars).
            </li>
            <li>
              Local: run <code>stripe listen --forward-to localhost:3000/api/stripe/webhook</code> and paste{" "}
              <code>STRIPE_WEBHOOK_SECRET</code>. Production: add a Live webhook at{" "}
              <code>/api/stripe/webhook</code>.
            </li>
            <li>Test cards: 4242 4242 4242 4242. Live mode charges real cards.</li>
          </ol>
          {dev ? <p className="mt-3">Until then, use “Unlock Pro for local demo” (AUTH_DEV_MODE=true).</p> : null}
        </div>
      ) : null}
    </div>
  );
}
