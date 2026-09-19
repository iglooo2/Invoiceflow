import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { githubAuthEnabled, isDevMode, resendEnabled } from "@/lib/utils";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale } from "@/lib/i18n";
import { AuthForms } from "./auth-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).meta.loginTitle };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const query = await searchParams;
  return (
    <div>
      <MarketingHeader signedIn={false} locale={locale} path="/login" copy={dict.nav} />
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-4xl">{dict.login.headline}</h1>
          <p className="mt-4 text-muted-foreground">
            {dict.login.lede}
          </p>
        </div>
        <AuthForms
          githubEnabled={githubAuthEnabled()}
          magicEnabled={resendEnabled()}
          showDemoCredentials={isDevMode()}
          callbackUrl={typeof query.callbackUrl === "string" ? query.callbackUrl : "/dashboard"}
          copy={dict.login}
        />
      </main>
      <MarketingFooter locale={locale} path="/login" copy={dict.nav} />
    </div>
  );
}
