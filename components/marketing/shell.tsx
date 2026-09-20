import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { btnRowClass, Button } from "@/components/ui/button";
import { PartnerSlot } from "@/components/marketing/partner-slot";
import { getDictionary, type Dictionary } from "@/lib/dictionary";
import { ADVERTISE_PATH, CONTACT_PATH, SITE_DOMAIN, SITE_STUDIO, startFreeHref } from "@/lib/site";
import { getSponsorPlacement } from "@/lib/sponsor";
import { localizedPath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function MarketingHeader({
  signedIn,
  locale,
  path,
  copy,
}: {
  signedIn: boolean;
  locale: Locale;
  path: string;
  copy: Dictionary["nav"];
}) {
  return (
    <header className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-2 overflow-x-clip px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
      <Wordmark href={localizedPath(locale, "/")} />
      <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
        <Link href={`${localizedPath(locale, "/")}#how`} className="hover:text-foreground">
          {copy.how}
        </Link>
        <Link href={localizedPath(locale, "/estimates")} className="hover:text-foreground">
          {copy.estimates}
        </Link>
        <Link href={localizedPath(locale, "/pricing")} className="hover:text-foreground">
          {copy.pricing}
        </Link>
        <Link href={`${localizedPath(locale, "/")}#templates`} className="hover:text-foreground">
          {copy.templates}
        </Link>
        <Link href={localizedPath(locale, CONTACT_PATH)} className="hover:text-foreground">
          {copy.messageUs}
        </Link>
      </nav>
      <div className={cn(btnRowClass, "w-full min-w-0 justify-end sm:w-auto")}>
        <LanguageSwitcher locale={locale} path={path} label={copy.language} />
        {signedIn ? (
          <Button asChild>
            <Link href="/dashboard">{copy.dashboard}</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost">
              <Link href={localizedPath(locale, "/login")}>{copy.signIn}</Link>
            </Button>
            <Button asChild>
              <Link href={startFreeHref(false, locale)}>{copy.startFree}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export function MarketingFooter({
  locale,
  path,
  copy,
}: {
  locale: Locale;
  path: string;
  copy: Dictionary["nav"];
}) {
  const partner = getDictionary(locale).partner;
  const sponsor = getSponsorPlacement();
  return (
    <footer className="mt-20 border-t border-border/80">
      <div className="mx-auto w-full max-w-6xl px-4 pt-8">
        <PartnerSlot
          locale={locale}
          copy={partner}
          messageUs={copy.messageUs}
          sponsor={sponsor}
          variant="footer"
        />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Wordmark href={localizedPath(locale, "/")} />
        <p className="text-xs">{SITE_STUDIO} · {SITE_DOMAIN}</p>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap gap-4">
            <Link href={localizedPath(locale, "/estimates")}>{copy.estimates}</Link>
            <Link href={localizedPath(locale, "/pricing")}>{copy.pricing}</Link>
            <Link href={localizedPath(locale, ADVERTISE_PATH)}>{copy.advertise}</Link>
            <Link href={localizedPath(locale, "/terms")}>{copy.terms}</Link>
            <Link href={localizedPath(locale, "/privacy")}>{copy.privacy}</Link>
            <Link href={localizedPath(locale, CONTACT_PATH)}>{copy.messageUs}</Link>
            <Link href={localizedPath(locale, "/login")}>{copy.signIn}</Link>
          </div>
          <LanguageSwitcher locale={locale} path={path} label={copy.language} />
        </div>
      </div>
    </footer>
  );
}
