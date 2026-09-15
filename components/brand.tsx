import Link from "next/link";

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
      <span className={`font-display text-xl tracking-tight ${light ? "text-primary-foreground" : ""}`}>
        InvoiceFlow
      </span>
    </Link>
  );
}
