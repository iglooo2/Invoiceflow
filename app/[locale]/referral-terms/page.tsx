import type { Metadata } from "next";
import { hasSessionCookie } from "@/lib/session-cookie";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.referralTermsTitle };
}

export default async function ReferralTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale, dict } = marketingCopy((await params).locale);
  const signedIn = await hasSessionCookie();
  return (
    <div>
      <MarketingHeader signedIn={signedIn} locale={locale} path="/referral-terms" copy={dict.nav} />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">{dict.referralTerms.title}</h1>
        <p className="mt-4 text-muted-foreground">{dict.referralTerms.updated}</p>
        <div className="mt-8 grid gap-4 text-sm leading-7">
          {dict.referralTerms.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
      <MarketingFooter locale={locale} path="/referral-terms" copy={dict.nav} />
    </div>
  );
}
