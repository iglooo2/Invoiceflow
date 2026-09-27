import type { Metadata } from "next";
import Link from "next/link";
import { hasSessionCookie } from "@/lib/session-cookie";
import { INDUSTRY_ICONS } from "@/components/marketing/industry-icons";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/dictionary";
import { INDUSTRY_SLUGS } from "@/lib/industries";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";
import { INDUSTRIES_PATH, PRODUCTS_PATH, SITE_URL, startFreeHref } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/industries">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.industriesTitle,
    description: dict.meta.industriesDescription,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, INDUSTRIES_PATH)}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, INDUSTRIES_PATH)}`]),
      ),
    },
  };
}

export default async function IndustriesPage({ params }: PageProps<"/[locale]/industries">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const signedIn = await hasSessionCookie();
  const startHref = signedIn ? "/dashboard" : startFreeHref(false, locale);
  const startLabel = signedIn ? dict.nav.dashboard : dict.nav.startFree;

  return (
    <div className="landing-canvas">
      <MarketingHeader signedIn={signedIn} locale={locale} path={INDUSTRIES_PATH} copy={dict.nav} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-4 pt-8 sm:pt-12">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{dict.meta.industriesTitle}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{dict.industries.lede}</p>
        <div className="btn-row mt-6">
          <Button asChild>
            <Link href={startHref}>{startLabel}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={localizedPath(locale, PRODUCTS_PATH)}>{dict.industries.seeProducts}</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {INDUSTRY_SLUGS.map((slug, index) => {
            const item = dict.industries.items[index];
            const Icon = INDUSTRY_ICONS[index];
            if (!item) return null;
            return (
              <article id={slug} key={slug} className="paper-card scroll-mt-24 rounded-2xl p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#3f8f45]" aria-hidden /> : null}
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link href={startHref} className="font-medium text-primary">
                    {startLabel}
                  </Link>
                  <Link href={localizedPath(locale, PRODUCTS_PATH)} className="font-medium">
                    {dict.industries.seeProducts}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <MarketingFooter locale={locale} path={INDUSTRIES_PATH} copy={dict.nav} />
    </div>
  );
}
