import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Camera,
  Check,
  ClipboardList,
  FileSignature,
  Layers,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { ESTIMATE_NEW_PATH } from "@/lib/estimates";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

const themeIcons = [ClipboardList, Smartphone, Sparkles, Layers, FileSignature, Camera] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/estimates">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.estimatesTitle,
    description: dict.meta.estimatesDescription,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, "/estimates")}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, "/estimates")}`]),
      ),
    },
  };
}

export default async function EstimatesMarketingPage({ params }: PageProps<"/[locale]/estimates">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const user = await getCurrentUser();
  const createHref = user ? ESTIMATE_NEW_PATH : localizedPath(locale, "/login");
  const copy = dict.estimatesPage;

  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} locale={locale} path="/estimates" copy={dict.nav} />
      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{copy.lede}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={createHref}>{user ? copy.create : copy.startFreeCreate}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={localizedPath(locale, "/pricing")}>{dict.home.seePricing}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{copy.freeNote}</p>
          </div>
          <HeroEstimate copy={copy} />
        </section>

        <section className="grid gap-6 py-8 md:grid-cols-2 lg:grid-cols-3">
          {copy.themes.map((item, index) => {
            const Icon = themeIcons[index] ?? Sparkles;
            return (
              <div key={item.title} className="paper-card rounded-3xl p-6">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 font-display text-2xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-8 py-12 lg:grid-cols-2">
          <div className="paper-card rounded-3xl p-8">
            <h2 className="font-display text-3xl">{copy.buildTitle}</h2>
            <ul className="mt-6 grid gap-3 text-sm leading-6">
              {copy.buildItems.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
            <Button asChild className="mt-6">
              <Link href={createHref}>{copy.create}</Link>
            </Button>
          </div>
          <div className="paper-card rounded-3xl p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">{copy.qbEyebrow}</p>
            <h2 className="mt-3 font-display text-3xl">{copy.qbTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{copy.qbLede}</p>
            <ul className="mt-6 grid gap-3 text-sm leading-6">
              {copy.qbItems.map((item) => (
                <li key={item}>
                  <Check className="mr-2 inline h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              {copy.qbNoteBefore}{" "}
              <code className="text-xs">INTUIT_CLIENT_ID</code> / <code className="text-xs">INTUIT_CLIENT_SECRET</code>{" "}
              {copy.qbNoteMid}{" "}
              <Link
                href={user ? "/dashboard/settings/quickbooks" : localizedPath(locale, "/login")}
                className="underline"
              >
                {dict.app.settings}
              </Link>{" "}
              {copy.qbNoteAfter}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={user ? "/dashboard/settings/quickbooks" : localizedPath(locale, "/login")}>
                {copy.qbCta}
              </Link>
            </Button>
          </div>
        </section>

        <section className="paper-card mb-8 rounded-[28px] p-8 md:p-12">
          <div className="flex items-start gap-3">
            <Bell className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-3xl">{copy.notifyTitle}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{copy.notifyLede}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={createHref}>{user ? copy.create : dict.nav.startFree}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={localizedPath(locale, "/login")}>{dict.nav.signIn}</Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} path="/estimates" copy={dict.nav} />
    </div>
  );
}

function HeroEstimate({
  copy,
}: {
  copy: ReturnType<typeof getDictionary>["estimatesPage"];
}) {
  return (
    <div className="paper-card -rotate-1 rounded-[28px] p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{copy.heroStudio}</p>
          <p className="font-display text-3xl">{copy.heroTitle}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{copy.heroStatus}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{copy.heroClient}</p>
      <div className="mt-6 grid gap-2 text-sm">
        {copy.heroLines.map((line) => (
          <div key={line.label} className="flex justify-between border-b border-border py-2 last:border-b-0">
            <span>{line.label}</span>
            <span>{line.amount}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 font-medium">
          <span>{copy.heroTotal}</span>
          <span>{copy.heroTotalAmount}</span>
        </div>
      </div>
    </div>
  );
}
