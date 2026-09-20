import type { Metadata } from "next";
import { hasSessionCookie } from "@/lib/session-cookie";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.termsTitle };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const signedIn = await hasSessionCookie();
  return (
    <div>
      <MarketingHeader signedIn={signedIn} locale={locale} path="/terms" copy={dict.nav} />
      <main className="prose mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">{dict.terms.title}</h1>
        <p className="mt-4 text-muted-foreground">{dict.terms.updated}</p>
        <div className="mt-8 grid gap-4 text-sm leading-7">
          {dict.terms.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
      <MarketingFooter locale={locale} path="/terms" copy={dict.nav} />
    </div>
  );
}
