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

/** Same order as PRODUCT_COLUMNS: Run Your Business, Get Paid, Win More Work, Stay Organized. */
const COLUMN_ICONS: LucideIcon[][] = [
  [CalendarDays, Users, Sparkles],
  [ClipboardList, FileText, CreditCard],
  [Star, Home, Handshake],
  [Receipt, BarChart3, RefreshCw],
];

const ICON = "#7eb526";
const ARROW = "#3e45d7";

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
    <section id="features" className="scroll-mt-24 bg-[#f6f6f6]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
          {copy.columns.map((column, index) => {
            const links = PRODUCT_COLUMNS[index];
            const headingHref = links ? productHref(links.heading, signedIn, locale) : null;
            const heading = (
              <>
                <h2 className="text-base font-bold tracking-tight text-[#111]">{column.title}</h2>
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: ARROW }}
                >
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </>
            );
            return (
              <div key={column.title}>
                {headingHref ? (
                  <Link href={headingHref} className="inline-flex items-center gap-2">
                    {heading}
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2">{heading}</div>
                )}
                <p className="mt-2 text-sm leading-6 text-[#6e6e6e]">{column.body}</p>
                <ul className="mt-5 grid gap-3.5">
                  {column.items.map((title, itemIndex) => {
                    const link = links?.items[itemIndex];
                    const href = link ? productHref(link, signedIn, locale) : null;
                    const Icon = COLUMN_ICONS[index]?.[itemIndex] ?? Sparkles;
                    const body = (
                      <>
                        <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: ICON }} aria-hidden />
                        <span>
                          <span className="block text-sm font-bold leading-5 text-[#111]">{title}</span>
                          {href ? null : (
                            <span className="block text-[11px] leading-4 text-[#8a8a8a]">{copy.comingSoon}</span>
                          )}
                        </span>
                      </>
                    );
                    return (
                      <li key={title}>
                        {href ? (
                          <Link href={href} className="flex items-start gap-2.5 hover:opacity-80">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-start gap-2.5">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-[#e4e4e4] pt-4 text-sm font-medium text-[#333]">
          <Link href="#features" className="inline-flex items-center gap-2 hover:text-[#111]">
            <LayoutGrid className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
            {copy.allFeatures}
          </Link>
          {rewardsHref ? (
            <Link href={rewardsHref} className="inline-flex items-center gap-2 hover:text-[#111]">
              <Gift className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
              {copy.earnRewards}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
