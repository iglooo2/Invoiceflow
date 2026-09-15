import Link from "next/link";
import { SITE_NAME, SITE_STUDIO } from "@/lib/site";

export function Wordmark({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${
          light ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        IF
      </span>
      <span className={`flex items-baseline gap-1.5 ${light ? "text-primary-foreground" : ""}`}>
        <span className="font-display text-xl tracking-tight">{SITE_NAME}</span>
        <span className={`text-[11px] font-medium uppercase tracking-[0.16em] ${light ? "opacity-80" : "text-muted-foreground"}`}>
          Studio
        </span>
      </span>
      <span className="sr-only">{SITE_STUDIO}</span>
    </Link>
  );
}
