import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale } from "@/lib/i18n";
import { CONTACT_PATH } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.contactTitle };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} locale={locale} path={CONTACT_PATH} copy={dict.nav} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-16">
        <ContactForm copy={dict.contact} />
      </main>
      <MarketingFooter locale={locale} path={CONTACT_PATH} copy={dict.nav} />
    </div>
  );
}
