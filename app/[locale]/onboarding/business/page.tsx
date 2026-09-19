import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, localizedPath } from "@/lib/i18n";
import { hasOnboardingProfile, needsOnboarding } from "@/lib/onboarding";
import { requireUser } from "@/lib/session";
import { BusinessOnboardingForm } from "../onboarding-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/onboarding/business">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.onboardingBusinessTitle };
}

export default async function OnboardingBusinessPage({
  params,
}: PageProps<"/[locale]/onboarding/business">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await requireUser();
  if (!needsOnboarding(user)) redirect("/dashboard");
  if (!hasOnboardingProfile(user)) {
    redirect(localizedPath(locale, "/onboarding"));
  }
  return (
    <div>
      <MarketingHeader signedIn locale={locale} path="/onboarding/business" copy={dict.nav} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
        <h1 className="font-display text-4xl md:text-5xl">{dict.onboarding.businessTitle}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{dict.onboarding.businessLede}</p>
        <div className="mt-10 text-left">
          <BusinessOnboardingForm
            locale={locale}
            copy={dict.onboarding}
            businessName={user.businessName ?? ""}
            employeeCount={user.employeeCount ?? ""}
            industry={user.industry ?? ""}
          />
        </div>
      </main>
      <MarketingFooter locale={locale} path="/onboarding/business" copy={dict.nav} />
    </div>
  );
}
