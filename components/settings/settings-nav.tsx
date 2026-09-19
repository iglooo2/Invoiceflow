"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Link2,
  Percent,
  Receipt,
  SlidersHorizontal,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard/settings/account", key: "account" as const, icon: UserRound },
  { href: "/dashboard/settings/company", key: "company" as const, icon: Building2 },
  { href: "/dashboard/settings/links", key: "links" as const, icon: Link2 },
  { href: "/dashboard/settings/preferences", key: "preferences" as const, icon: SlidersHorizontal },
  { href: "/dashboard/settings/documents", key: "documents" as const, icon: ClipboardList },
  { href: "/dashboard/settings/taxes", key: "taxes" as const, icon: Wallet },
  { href: "/dashboard/settings/markup", key: "markup" as const, icon: Percent },
  { href: "/dashboard/settings/quickbooks", key: "quickbooks" as const, icon: Receipt },
];

export function SettingsNav({
  labels,
}: {
  labels: Record<(typeof ITEMS)[number]["key"], string>;
}) {
  const pathname = usePathname();
  return (
    <nav className="paper-card h-fit w-full shrink-0 overflow-hidden rounded-2xl p-2 sm:w-56">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm uppercase tracking-[0.08em]",
              active
                ? "bg-accent/10 font-semibold text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{labels[item.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
