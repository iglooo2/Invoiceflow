"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { INDUSTRY_ICONS } from "@/components/marketing/industry-icons";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { IndustrySlug } from "@/lib/industries";
import { INDUSTRIES_PATH } from "@/lib/site";
import { cn } from "@/lib/utils";

const iconClass = "h-4 w-4 shrink-0 text-[#3f8f45]";

export type IndustryMenuItem = {
  slug: IndustrySlug;
  title: string;
};

function industryHref(locale: Locale, slug?: IndustrySlug) {
  const page = localizedPath(locale, INDUSTRIES_PATH);
  return slug ? `${page}#${slug}` : page;
}

export function IndustriesMenu({
  locale,
  label,
  allLabel,
  items,
}: {
  locale: Locale;
  label: string;
  allLabel: string;
  items: IndustryMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 180);
  }

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        onPointerEnter={show}
        onPointerLeave={hide}
        className="group inline-flex items-center gap-1 rounded-full text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={10}
          collisionPadding={12}
          onPointerEnter={show}
          onPointerLeave={hide}
          className="z-50 w-[min(960px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-[#f7f6f3] shadow-[0_24px_60px_-36px_rgba(28,25,23,0.45)]"
        >
          <div className="relative">
            <span className="absolute inset-y-0 left-0 w-1 bg-[#3f8f45]" aria-hidden />
            <ul className="grid grid-cols-5 gap-x-1 gap-y-1 px-3 py-3">
              {items.map((item, index) => {
                const Icon = INDUSTRY_ICONS[index];
                return (
                  <li key={item.slug}>
                    <DropdownMenu.Item asChild>
                      <Link
                        href={industryHref(locale, item.slug)}
                        className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold leading-snug text-foreground outline-none data-[highlighted]:bg-white"
                      >
                        {Icon ? <Icon className={iconClass} aria-hidden /> : null}
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenu.Item>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border bg-[#eceae6]">
              <DropdownMenu.Item asChild>
                <Link
                  href={industryHref(locale)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground outline-none data-[highlighted]:bg-white/70"
                >
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {allLabel}
                </Link>
              </DropdownMenu.Item>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function IndustriesMobile({
  locale,
  label,
  allLabel,
  items,
}: {
  locale: Locale;
  label: string;
  allLabel: string;
  items: IndustryMenuItem[];
}) {
  return (
    <details className="group w-full overflow-hidden rounded-2xl border border-border bg-[#f7f6f3] lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="grid grid-cols-1 border-t border-border sm:grid-cols-2">
        {items.map((item, index) => {
          const Icon = INDUSTRY_ICONS[index] ?? INDUSTRY_ICONS[0];
          return (
            <li key={item.slug} className={cn(index > 0 && "border-t border-border sm:border-t-0", index % 2 === 1 && "sm:border-l")}>
              <Link
                href={industryHref(locale, item.slug)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold"
              >
                {Icon ? <Icon className={iconClass} aria-hidden /> : null}
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={industryHref(locale)}
        className="flex items-center gap-2 border-t border-border bg-[#eceae6] px-4 py-3 text-sm font-medium"
      >
        <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden />
        {allLabel}
      </Link>
    </details>
  );
}
