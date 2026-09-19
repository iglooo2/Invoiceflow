import Link from "next/link";
import { ArrowRight, FileText, Link2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { startFreeHref } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { StudioProduct } from "@/components/marketing/studio-product";
import { marketingCopy } from "@/lib/i18n-request";
import { getDictionary } from "@/lib/dictionary";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";

const howIcons = [Sparkles, FileText, Link2] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, "/")}`,
      languages: Object.fromEntries(LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, "/")}`])),
    },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const ctaHref = startFreeHref(signedIn, locale);

  return (
    <div className="landing-canvas">
      <MarketingHeader signedIn={signedIn} locale={locale} path="/" copy={dict.nav} />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-6 pt-6 text-center sm:pt-10">
          <p className="text-xs uppercase tracking-[0.28em] text-primary">{dict.home.eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-4xl whitespace-pre-line font-display text-[2.4rem] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-6xl md:text-[4.25rem]">
            {dict.home.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {dict.home.lede}
          </p>
        </section>

        <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-2">
          <StudioProduct />
          <div className="relative z-10 mx-auto -mt-5 flex justify-center sm:-mt-6">
            <Button asChild variant="soft">
              <Link href={ctaHref}>{signedIn ? dict.home.openStudio : dict.home.startCta}</Link>
            </Button>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4">
          <section id="how" className="grid scroll-mt-24 gap-6 py-12 md:grid-cols-3">
            {dict.home.how.map((item, index) => {
              const Icon = howIcons[index] ?? Sparkles;
              return (
                <div key={item.title} className="paper-card rounded-3xl p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 font-display text-2xl">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 py-12 lg:grid-cols-2">
            {Object.values(PLANS).map((plan) => {
              const copy = dict.plans[plan.id];
              return (
                <div key={plan.id} className="paper-card rounded-3xl p-8">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground">{copy.name}</p>
                  <p className="mt-2 font-display text-4xl">
                    {plan.monthlyPrice === 0 ? dict.home.freePrice : `$${plan.monthlyPrice}`}
                    {plan.monthlyPrice ? <span className="text-lg text-muted-foreground">{dict.home.perMonthShort}</span> : null}
                  </p>
                  <p className="mt-2 text-muted-foreground">{copy.blurb}</p>
                  <ul className="mt-6 grid gap-2 text-sm">
                    {copy.features.map((feature) => (
                      <li key={feature}>— {feature}</li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6">
                    <Link href={signedIn ? (plan.id === "pro" ? "/dashboard/billing" : "/dashboard") : startFreeHref(false, locale)}>
                      {plan.id === "pro" ? dict.home.goPro : dict.home.startStarter} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </section>
        </div>
      </main>
      <MarketingFooter locale={locale} path="/" copy={dict.nav} />
    </div>
  );
}
