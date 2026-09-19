import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.pricingTitle,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, "/pricing")}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, "/pricing")}`]),
      ),
    },
  };
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} locale={locale} path="/pricing" copy={dict.nav} />
      <main className="mx-auto w-full max-w-5xl px-4 py-16">
        <h1 className="font-display text-5xl">{dict.pricing.headline}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {dict.pricing.lede}
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const copy = dict.plans[plan.id];
            return (
              <div key={plan.id} className="paper-card rounded-3xl p-8">
                <h2 className="font-display text-3xl">{copy.name}</h2>
                <p className="mt-2 font-display text-4xl">
                  {plan.monthlyPrice === 0 ? "$0" : `$${plan.monthlyPrice}`}
                  <span className="text-lg text-muted-foreground"> {dict.pricing.perMonth}</span>
                </p>
                <p className="mt-2 text-muted-foreground">{copy.blurb}</p>
                <ul className="mt-6 grid gap-2 text-sm">
                  {copy.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button asChild className="mt-6">
                  <Link href={user ? "/dashboard/billing" : localizedPath(locale, "/login")}>
                    {plan.id === "pro" ? dict.pricing.upgradePro : dict.pricing.useStarter}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter locale={locale} path="/pricing" copy={dict.nav} />
    </div>
  );
}
