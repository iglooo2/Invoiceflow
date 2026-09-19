import Link from "next/link";
import { LOCALES, LOCALE_LABELS, localizedPath, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  path,
  label,
}: {
  locale: Locale;
  path: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Link
            key={code}
            href={localizedPath(code, path)}
            hrefLang={LOCALE_LABELS[code].html}
            lang={LOCALE_LABELS[code].html}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-foreground px-2 py-0.5 text-background"
                : "rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground"
            }
          >
            {LOCALE_LABELS[code].short}
            <span className="sr-only"> {LOCALE_LABELS[code].native}</span>
          </Link>
        );
      })}
    </nav>
  );
}
