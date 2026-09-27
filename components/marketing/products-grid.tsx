import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  Handshake,
  Home,
  LayoutGrid,
  Receipt,
  RefreshCw,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/dictionary";
import { type Locale } from "@/lib/i18n";
import { PRODUCT_COLUMNS, REWARDS_LINK, productHref } from "@/lib/products";
import { cn } from "@/lib/utils";

const COLUMN_ICONS: LucideIcon[][] = [
  [ClipboardList, FileText, CreditCard],
  [CalendarDays, Users, Sparkles],
  [Receipt, BarChart3, RefreshCw],
  [Star, Home, Handshake],
];

export function ProductsGrid({
  signedIn,
  locale,
  copy,
}: {
  signedIn: boolean;
  locale: Locale;
  copy: Dictionary["products"];
}) {
  const rewardsHref = productHref(REWARDS_LINK, signedIn, locale);

  return (
    <section id="features" className="paper-card relative scroll-mt-24 overflow-hidden rounded-2xl">
      <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {copy.columns.map((column, index) => {
          const links = PRODUCT_COLUMNS[index];
          const headingHref = links ? productHref(links.heading, signedIn, locale) : null;
          return (
            <div
              key={column.title}
              className={cn(
                "px-5 py-6 sm:px-6 sm:py-7",
                index > 0 && "border-t border-border lg:border-t-0 lg:border-l",
              )}
            >
              {headingHref ? (
                <Link href={headingHref} className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                  <h2 className="text-[15px] font-semibold tracking-tight">{column.title}</h2>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </Link>
              ) : (
                <h2 className="text-[15px] font-semibold tracking-tight">{column.title}</h2>
              )}
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{column.body}</p>
              <ul className="mt-5 grid gap-3">
                {column.items.map((title, itemIndex) => {
                  const link = links?.items[itemIndex];
                  const href = link ? productHref(link, signedIn, locale) : null;
                  const Icon = COLUMN_ICONS[index]?.[itemIndex] ?? Sparkles;
                  const body = (
                    <>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <span>
                        <span className="block leading-5">{title}</span>
                        {href ? null : (
                          <span className="block text-[11px] leading-4 text-muted-foreground">{copy.comingSoon}</span>
                        )}
                      </span>
                    </>
                  );
                  return (
                    <li key={title}>
                      {href ? (
                        <Link href={href} className="flex items-start gap-2.5 text-sm hover:text-primary">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-2.5 text-sm">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border bg-muted px-5 py-3 text-sm font-medium sm:px-6">
        <Link href="#features" className="inline-flex items-center gap-2 hover:text-foreground">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden />
          {copy.allFeatures}
        </Link>
        {rewardsHref ? (
          <Link href={rewardsHref} className="inline-flex items-center gap-2 hover:text-foreground">
            <Gift className="h-4 w-4 text-muted-foreground" aria-hidden />
            {copy.earnRewards}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
