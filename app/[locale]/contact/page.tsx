import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { ContactForm } from "@/components/marketing/contact-form";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, localizedPath } from "@/lib/i18n";
import { CONTACT_PATH } from "@/lib/site";
import Link from "next/link";

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
    <div className="min-h-screen bg-[#050a1f] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Wordmark href={localizedPath(locale, "/")} light />
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} path={CONTACT_PATH} label={dict.nav.language} />
          <Link
            href={user ? "/dashboard" : localizedPath(locale, "/login")}
            className="text-sm text-white/70 hover:text-white"
          >
            {user ? dict.nav.dashboard : dict.nav.signIn}
          </Link>
        </div>
      </header>
      <main className="flex justify-center px-4 py-6 pb-16">
        <ContactForm copy={dict.contact} />
      </main>
    </div>
  );
}
