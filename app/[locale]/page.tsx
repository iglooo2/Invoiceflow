import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FileText, Link2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
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
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} locale={locale} path="/" copy={dict.nav} />
      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{dict.home.eyebrow}</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              {dict.home.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              {dict.home.lede}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={localizedPath(locale, "/login")}>{dict.home.createInvoice}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={localizedPath(locale, "/pricing")}>{dict.home.seePricing}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {dict.home.freeNote}
            </p>
          </div>
          <HeroInvoice />
        </section>

        <section id="how" className="grid gap-6 py-12 md:grid-cols-3">
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

        <section id="templates" className="py-12">
          <h2 className="font-display text-4xl">{dict.home.templatesTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {dict.home.templatesLede}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {dict.home.templates.map((item) => (
              <div key={item.title} className="rounded-3xl border border-border bg-card/70 p-6">
                <h3 className="font-display text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
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
                  <Link href={localizedPath(locale, "/login")}>
                    {plan.id === "pro" ? dict.home.goPro : dict.home.startStarter} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </section>
      </main>
      <MarketingFooter locale={locale} path="/" copy={dict.nav} />
    </div>
  );
}

function HeroInvoice() {
  return (
    <div className="paper-card rotate-1 rounded-[28px] p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studio North</p>
          <p className="font-display text-3xl">Invoice INV-2026-0001</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Sent</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Hearth Goods · Due {format(new Date(), "MMM d")}
      </p>
      <div className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between border-b border-border py-2">
          <span>Visual identity system</span>
          <span>$2,400</span>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <span>Logo suite</span>
          <span>$1,200</span>
        </div>
        <div className="flex justify-between py-2 font-medium">
          <span>Total due</span>
          <span>$4,450</span>
        </div>
      </div>
    </div>
  );
}
