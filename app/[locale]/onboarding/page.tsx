import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, localizedPath } from "@/lib/i18n";
import {
  hasOnboardingProfile,
  needsOnboarding,
  parsePhone,
  splitName,
} from "@/lib/onboarding";
import { requireUser } from "@/lib/session";
import { ProfileOnboardingForm } from "./onboarding-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.onboardingTitle };
}

export default async function OnboardingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/onboarding">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await requireUser();
  if (!needsOnboarding(user)) redirect("/dashboard");
  const query = await searchParams;
  const editing = typeof query.edit === "string" && query.edit === "1";
  if (hasOnboardingProfile(user) && !editing) {
    redirect(localizedPath(locale, "/onboarding/business"));
  }
  const { firstName, lastName } = splitName(user.name);
  const parsed = parsePhone(user.phone);
  return (
    <div>
      <MarketingHeader signedIn locale={locale} path="/onboarding" copy={dict.nav} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
        <h1 className="font-display text-4xl md:text-5xl">{dict.onboarding.profileTitle}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{dict.onboarding.profileLede}</p>
        <div className="mt-10 text-left">
          <ProfileOnboardingForm
            locale={locale}
            copy={dict.onboarding}
            nav={dict.nav}
            firstName={firstName}
            lastName={lastName}
            countryIso={parsed.countryIso}
            nationalNumber={parsed.nationalNumber}
          />
        </div>
      </main>
      <MarketingFooter locale={locale} path="/onboarding" copy={dict.nav} />
    </div>
  );
}
