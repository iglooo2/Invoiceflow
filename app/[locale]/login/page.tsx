import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { appleAuthEnabled, ensureAuthRuntimeEnv, githubAuthEnabled, googleAuthEnabled, resendEnabled } from "@/lib/auth-env";
import { isOauthAccountNotLinkedCode, loginQueryErrorMessage } from "@/lib/auth-errors";
import { getCurrentUser } from "@/lib/session";
import { hasSessionCookie } from "@/lib/session-cookie";
import { isDevMode } from "@/lib/utils";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale } from "@/lib/i18n";
import { nextOnboardingPath } from "@/lib/onboarding";
import { AuthForms } from "./auth-forms";

// Request-time so AUTH_GOOGLE_* / AUTH_APPLE_* Worker secrets are visible.
// Do not SSG this page — Next may otherwise bake disabled OAuth buttons at cf:build.
export const dynamic = "force-dynamic";

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
  await connection();
  await ensureAuthRuntimeEnv();
  const { locale, dict } = marketingCopy((await params).locale);
  const user = (await hasSessionCookie()) ? await getCurrentUser() : null;
  if (user) redirect(nextOnboardingPath(user, locale));
  const query = await searchParams;
  const errorCode = typeof query.error === "string" ? query.error : null;
  const authError = loginQueryErrorMessage(errorCode, dict.login.errors);
  const registerRequested = typeof query.mode === "string" && query.mode === "register";
  const initialMode = isOauthAccountNotLinkedCode(errorCode) ? "signin" : registerRequested ? "register" : "signin";
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
          googleEnabled={googleAuthEnabled()}
          appleEnabled={appleAuthEnabled()}
          magicEnabled={resendEnabled()}
          showDemoCredentials={isDevMode()}
          callbackUrl={typeof query.callbackUrl === "string" ? query.callbackUrl : "/dashboard"}
          initialMode={initialMode}
          copy={dict.login}
          initialError={authError}
        />
      </main>
      <MarketingFooter locale={locale} path="/login" copy={dict.nav} />
    </div>
  );
}
