import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/dictionary";
import { CONTACT_MAILTO, SITE_DOMAIN, SITE_STUDIO } from "@/lib/site";
import { localizedPath, type Locale } from "@/lib/i18n";

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
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
      <Wordmark href={localizedPath(locale, "/")} />
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
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
      </nav>
      <div className="flex items-center gap-3">
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
              <Link href={localizedPath(locale, "/login")}>{copy.startFree}</Link>
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
  return (
    <footer className="mt-20 border-t border-border/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Wordmark href={localizedPath(locale, "/")} />
        <p className="text-xs">{SITE_STUDIO} · {SITE_DOMAIN}</p>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap gap-4">
            <Link href={localizedPath(locale, "/estimates")}>{copy.estimates}</Link>
            <Link href={localizedPath(locale, "/pricing")}>{copy.pricing}</Link>
            <Link href={localizedPath(locale, "/terms")}>{copy.terms}</Link>
            <Link href={localizedPath(locale, "/privacy")}>{copy.privacy}</Link>
            <a href={CONTACT_MAILTO}>{copy.messageUs}</a>
            <Link href={localizedPath(locale, "/login")}>{copy.signIn}</Link>
          </div>
          <LanguageSwitcher locale={locale} path={path} label={copy.language} />
        </div>
      </div>
    </footer>
  );
}
