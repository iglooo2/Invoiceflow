import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireUser, studioName, planFromUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const links = [
  ["Overview", "/dashboard"],
  ["Invoices", "/dashboard/invoices"],
  ["Estimates", "/dashboard/estimates"],
  ["Clients", "/dashboard/clients"],
  ["Billing", "/dashboard/billing"],
  ["Settings", "/dashboard/settings"],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = planFromUser(user);
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Wordmark href="/dashboard" />
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-muted-foreground sm:inline">{studioName(user)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{plan}</span>
              <form action={logout}>
                <Button variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
