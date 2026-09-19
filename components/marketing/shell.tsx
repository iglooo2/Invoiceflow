import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { SITE_DOMAIN, SITE_STUDIO } from "@/lib/site";

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
      <Wordmark />
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
        <Link href="/#how" className="hover:text-foreground">
          How it works
        </Link>
        <Link href="/pricing" className="hover:text-foreground">
          Pricing
        </Link>
        <Link href="/#templates" className="hover:text-foreground">
          Templates
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        {signedIn ? (
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login?mode=register">Start free</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-border/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="text-xs">{SITE_STUDIO} · {SITE_DOMAIN}</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
