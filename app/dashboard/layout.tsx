import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { appCopy } from "@/lib/i18n-request";
import { needsOnboarding, nextOnboardingPath } from "@/lib/onboarding";
import { displayPersonName } from "@/lib/studio-settings";
import { requireUser, planFromUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { locale, dict } = await appCopy();
  if (needsOnboarding(user)) {
    redirect(nextOnboardingPath(user, locale));
  }
  const plan = planFromUser(user);
  const links = [
    [dict.app.overview, "/dashboard"],
    [dict.app.invoices, "/dashboard/invoices"],
    [dict.app.estimates, "/dashboard/estimates"],
    [dict.app.clients, "/dashboard/clients"],
    [dict.app.billing, "/dashboard/billing"],
    [dict.app.settings, "/dashboard/settings"],
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Wordmark href="/dashboard" />
            <div className="btn-row justify-end text-sm">
              <LanguageSwitcher locale={locale} path="/dashboard" label={dict.nav.language} persist="cookie" />
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {plan === "pro" ? dict.plans.pro.name : dict.plans.free.name}
              </span>
              <AccountMenu
                name={displayPersonName(user)}
                myAccountLabel={dict.app.myAccount}
                logoutLabel={dict.app.logout}
              />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
