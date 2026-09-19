"use client";

import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { isLocale, localeCookieValue, LOCALES, LOCALE_LABELS, localizedPath, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  path,
  label,
  align = "end",
  persist = "route",
}: {
  locale: Locale;
  path: string;
  label: string;
  align?: "start" | "end" | "center";
  persist?: "route" | "cookie";
}) {
  const router = useRouter();
  const current = LOCALE_LABELS[locale];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border bg-transparent px-3 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${label}: ${current.native}`}
      >
        <span className="sm:hidden">{current.short}</span>
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-44 rounded-2xl border border-border bg-card p-1 shadow-[0_16px_40px_-24px_rgba(28,25,23,0.45)]"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={locale}
            onValueChange={(value) => {
              if (!isLocale(value)) return;
              if (persist === "cookie") {
                document.cookie = localeCookieValue(value);
                router.refresh();
                return;
              }
              router.push(localizedPath(value, path));
            }}
          >
            {LOCALES.map((code) => {
              const option = LOCALE_LABELS[code];
              return (
                <DropdownMenu.RadioItem
                  key={code}
                  value={code}
                  lang={option.html}
                  className="relative flex cursor-pointer items-center rounded-xl py-2 pl-8 pr-3 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[state=checked]:font-medium"
                >
                  <DropdownMenu.ItemIndicator className="absolute left-2.5 inline-flex">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                  {option.native}
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
