import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto w-full max-w-5xl px-4 py-16">
        <h1 className="font-display text-5xl">Simple pricing for a simple job.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          InvoiceFlow is not an accounting suite. It’s the fastest way to send a beautiful invoice or
          proposal and know whether it got paid.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="paper-card rounded-3xl p-8">
              <h2 className="font-display text-3xl">{plan.name}</h2>
              <p className="mt-2 font-display text-4xl">
                {plan.monthlyPrice === 0 ? "$0" : `$${plan.monthlyPrice}`}
                <span className="text-lg text-muted-foreground"> / month</span>
              </p>
              <p className="mt-2 text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-6 grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button asChild className="mt-6">
                <Link href={user ? "/dashboard/billing" : "/login"}>
                  {plan.id === "pro" ? "Upgrade to Pro" : "Use Starter"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
