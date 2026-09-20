import Link from "next/link";
import type { Dictionary } from "@/lib/dictionary";
import { localizedPath, type Locale } from "@/lib/i18n";
import { ADVERTISE_PATH, advertiseContactHref } from "@/lib/site";
import type { SponsorPlacement } from "@/lib/sponsor";
import { cn } from "@/lib/utils";

export function PartnerSlot({
  locale,
  copy,
  messageUs,
  sponsor,
  variant = "card",
}: {
  locale: Locale;
  copy: Dictionary["partner"];
  messageUs: string;
  sponsor: SponsorPlacement;
  variant?: "card" | "footer";
}) {
  const advertiseHref = localizedPath(locale, ADVERTISE_PATH);
  const contactHref = advertiseContactHref(locale);
  const footer = variant === "footer";

  return (
    <aside
      aria-label={copy.label}
      className={cn(
        footer
          ? "flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          : "paper-card mx-auto max-w-2xl rounded-3xl px-6 py-5 text-left",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.22em] text-accent",
          footer && "shrink-0",
        )}
      >
        {sponsor.active ? copy.sponsored : copy.label}
      </p>

      {sponsor.active ? (
        <div className={cn("min-w-0", footer ? "sm:text-right" : "mt-3 flex items-start gap-4")}>
          {sponsor.logoUrl && !footer ? (
            // External sponsor artwork — a plain img so Igor can change hosts without next.config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.logoUrl}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-2xl border border-border bg-muted object-contain p-1"
            />
          ) : null}
          <div className="min-w-0">
            <p className={cn("font-display text-foreground", footer ? "text-base" : "text-xl")}>{sponsor.name}</p>
            {sponsor.blurb && !footer ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{sponsor.blurb}</p>
            ) : null}
            <a
              href={sponsor.url}
              rel="sponsored noopener noreferrer"
              target="_blank"
              className={cn(
                "text-sm text-primary underline-offset-4 hover:underline",
                footer ? "mt-0.5 inline-block" : "mt-2 inline-block",
              )}
            >
              {copy.visit}
            </a>
          </div>
        </div>
      ) : (
        <div className={cn("min-w-0", footer ? "sm:text-right" : "mt-3")}>
          <p className={cn("font-display text-foreground", footer ? "text-base" : "text-xl")}>
            {copy.placeholderTitle}
          </p>
          {!footer ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.placeholderBlurb}</p> : null}
          <p className={cn("text-sm", footer ? "mt-0.5" : "mt-3")}>
            <Link href={advertiseHref} className="text-primary underline-offset-4 hover:underline">
              {copy.cta}
            </Link>
            <span className="text-muted-foreground"> · </span>
            <Link href={contactHref} className="text-muted-foreground underline-offset-4 hover:underline">
              {messageUs}
            </Link>
          </p>
        </div>
      )}
    </aside>
  );
}
