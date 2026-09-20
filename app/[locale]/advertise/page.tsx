import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { PartnerSlot } from "@/components/marketing/partner-slot";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";
import { ADVERTISE_PATH, advertiseContactHref, SITE_URL } from "@/lib/site";
import { getSponsorPlacement } from "@/lib/sponsor";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/advertise">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.advertiseTitle,
    description: dict.meta.advertiseDescription,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, ADVERTISE_PATH)}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, ADVERTISE_PATH)}`]),
      ),
    },
  };
}

export default async function AdvertisePage({ params }: PageProps<"/[locale]/advertise">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  const sponsor = getSponsorPlacement();
  const copy = dict.advertise;
  const contactHref = advertiseContactHref(locale);

  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} locale={locale} path={ADVERTISE_PATH} copy={dict.nav} />
      <main className="mx-auto w-full max-w-5xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">{copy.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05]">{copy.headline}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.lede}</p>

        <div className="mt-10">
          <PartnerSlot
            locale={locale}
            copy={dict.partner}
            messageUs={dict.nav.messageUs}
            sponsor={sponsor}
            variant="card"
          />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <section className="paper-card rounded-3xl p-6">
            <h2 className="font-display text-2xl">{copy.audienceTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.audienceBody}</p>
          </section>
          <section className="paper-card rounded-3xl p-6">
            <h2 className="font-display text-2xl">{copy.offerTitle}</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
              {copy.offerItems.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
          </section>
          <section className="paper-card rounded-3xl p-6">
            <h2 className="font-display text-2xl">{copy.ratesTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.ratesBody}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.ratesNote}</p>
          </section>
        </div>

        <section className="paper-card mt-10 rounded-3xl p-8">
          <h2 className="font-display text-3xl">{copy.contactTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.contactBody}</p>
          <Button asChild className="mt-6">
            <Link href={contactHref}>{copy.contactCta}</Link>
          </Button>
        </section>
      </main>
      <MarketingFooter locale={locale} path={ADVERTISE_PATH} copy={dict.nav} />
    </div>
  );
}
