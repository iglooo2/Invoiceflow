import Link from "next/link";
import { ArrowRight, Copy, RefreshCw, Table2 } from "lucide-react";
import { requestQuickbooksConnect } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { appCopy } from "@/lib/i18n-request";
import {
  INTUIT_CLIENT_ID_ENV,
  INTUIT_CLIENT_SECRET_ENV,
  INTUIT_REDIRECT_URI_ENV,
  quickbooksConfigured,
  quickbooksRedirectUri,
} from "@/lib/quickbooks";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { SITE_STUDIO } from "@/lib/site";

export default async function QuickbooksSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ qb?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { qb } = await searchParams;
  const qbReady = quickbooksConfigured();
  const copy = dict.app.settingsPage;
  const pro = isProPlan(user);
  const benefits = [
    { icon: Copy, text: copy.qbBenefit1 },
    { icon: RefreshCw, text: copy.qbBenefit2 },
    { icon: Table2, text: copy.qbBenefit3 },
  ];

  return (
    <section className="paper-card overflow-hidden rounded-2xl">
      <div className="grid gap-10 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">{copy.qbTitle}</h2>
          <div className="mt-6 flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              IF
            </span>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-sm font-semibold lowercase text-accent-foreground">
              qb
            </span>
            <span className="sr-only">{SITE_STUDIO} to QuickBooks</span>
          </div>
          <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">{copy.qbLede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {pro ? (
              <form action={requestQuickbooksConnect}>
                <Button type="submit" variant="secondary" size="lg">
                  {qbReady ? copy.qbConnectReady : copy.qbConnectSoon}
                </Button>
              </form>
            ) : (
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/billing">{copy.qbUpgrade}</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10">
              <Link href="/estimates">{copy.qbLearnMore}</Link>
            </Button>
          </div>
          {pro ? null : <p className="mt-8 text-sm text-foreground">{copy.qbProHint}</p>}
        </div>
        <ul className="grid gap-6 self-center">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.text} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="pt-1.5 text-sm leading-5">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
      {qb === "coming-soon" ? (
        <p className="border-t border-border bg-primary/10 px-6 py-3 text-sm md:px-10">
          {copy.qbReserved} <code>{INTUIT_CLIENT_ID_ENV}</code> / <code>{INTUIT_CLIENT_SECRET_ENV}</code>.{" "}
          {copy.qbRedirect} <code className="break-all">{quickbooksRedirectUri()}</code>
          {qbReady ? ` ${copy.qbCredsPresent}` : ` ${copy.qbCredsMissing}`} ({INTUIT_CLIENT_ID_ENV},{" "}
          {INTUIT_CLIENT_SECRET_ENV}, {INTUIT_REDIRECT_URI_ENV})
        </p>
      ) : null}
    </section>
  );
}
