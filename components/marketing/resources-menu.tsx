"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowRight, Calculator, ChevronDown, ClipboardList, FileText, Receipt, type LucideIcon } from "lucide-react";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { ResourceSlug } from "@/lib/resources";
import { TEMPLATES_PATH } from "@/lib/site";

const ICONS: LucideIcon[] = [FileText, Calculator, ClipboardList, Receipt];
const iconClass = "h-4 w-4 shrink-0 text-[#3f8f45]";

export type ResourceMenuItem = {
  slug: ResourceSlug;
  title: string;
};

function resourceHref(locale: Locale, slug?: ResourceSlug) {
  const page = localizedPath(locale, TEMPLATES_PATH);
  return slug ? `${page}#${slug}` : page;
}

function useHoverOpen() {
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
  return { open, setOpen, show, hide };
}

function ResourceLink({
  locale,
  item,
  index,
}: {
  locale: Locale;
  item: ResourceMenuItem;
  index: number;
}) {
  const Icon = ICONS[index] ?? FileText;
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={resourceHref(locale, item.slug)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold text-foreground outline-none data-[highlighted]:bg-white"
      >
        <Icon className={iconClass} aria-hidden />
        <span>{item.title}</span>
      </Link>
    </DropdownMenu.Item>
  );
}

export function ResourcesMenu({
  locale,
  label,
  title,
  lede,
  items,
}: {
  locale: Locale;
  label: string;
  title: string;
  lede: string;
  items: ResourceMenuItem[];
}) {
  const { open, setOpen, show, hide } = useHoverOpen();
  const middle = items.slice(0, 2);
  const side = items.slice(2);

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
          align="end"
          sideOffset={10}
          collisionPadding={12}
          onPointerEnter={show}
          onPointerLeave={hide}
          className="z-50 w-[min(820px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-[#f7f6f3] p-5 shadow-[0_24px_60px_-36px_rgba(28,25,23,0.45)]"
        >
          <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <DropdownMenu.Item asChild>
                <Link
                  href={resourceHref(locale)}
                  className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground outline-none data-[highlighted]:text-primary"
                >
                  {title}
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </Link>
              </DropdownMenu.Item>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{lede}</p>
            </div>
            <ul className="grid content-start gap-1">
              {middle.map((item, index) => (
                <li key={item.slug}>
                  <ResourceLink locale={locale} item={item} index={index} />
                </li>
              ))}
            </ul>
            <ul className="grid content-start gap-1">
              {side.map((item, index) => (
                <li key={item.slug}>
                  <ResourceLink locale={locale} item={item} index={index + 2} />
                </li>
              ))}
            </ul>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ResourcesMobile({
  locale,
  label,
  title,
  lede,
  items,
}: {
  locale: Locale;
  label: string;
  title: string;
  lede: string;
  items: ResourceMenuItem[];
}) {
  return (
    <details className="group w-full overflow-hidden rounded-2xl border border-border bg-[#f7f6f3] lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-4 border-t border-border px-4 py-4">
        <div>
          <Link href={resourceHref(locale)} className="inline-flex items-center gap-2 text-sm font-semibold">
            {title}
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </Link>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{lede}</p>
        </div>
        <ul className="grid gap-1">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? FileText;
            return (
              <li key={item.slug}>
                <Link href={resourceHref(locale, item.slug)} className="flex items-center gap-2.5 py-2 text-sm font-semibold">
                  <Icon className={iconClass} aria-hidden />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
