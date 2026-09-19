import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FileText, Link2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">For freelance creatives</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Invoices that look like your work. Sent before the coffee cools.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              InvoiceFlow Studio is the focused tool for designers, editors, and writers who would rather
              ship work than wrestle Word docs. Pick a template, send a gorgeous PDF or link, and see
              what’s paid — at invoiceflowstudio.com.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Create your first invoice</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free: 3 invoices and 3 estimates a month. No accounting suite. No 47-step wizard.
            </p>
          </div>
          <HeroInvoice />
        </section>

        <section id="how" className="grid gap-6 py-12 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Start from a studio template",
              body: "Design project, retainer, or video edit — not a blank spreadsheet pretending to be a brand.",
            },
            {
              icon: FileText,
              title: "Send PDF or a public link",
              body: "Clients open a clean page on their phone. You download a PDF that doesn’t look like 2009.",
            },
            {
              icon: Link2,
              title: "Track paid, sent, and overdue",
              body: "A simple list. Filters. That’s it. QuickBooks can wait until you actually need QuickBooks.",
            },
          ].map((item) => (
            <div key={item.title} className="paper-card rounded-3xl p-6">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-display text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section id="templates" className="py-12">
          <h2 className="font-display text-4xl">Templates you’ll actually use</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Seeded for the people this product is for: independent designers, video editors, and writers.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Design Project Invoice", "Discovery, identity system, logo suite, guidelines. 50% to start."],
              ["Retainer Invoice", "Hours plus async art direction. Pay-by-the-5th language included."],
              ["Video Edit Proposal", "The cut, deliverables, investment — accept or decline from the link."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl border border-border bg-card/70 p-6">
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-12 lg:grid-cols-2">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="paper-card rounded-3xl p-8">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">{plan.name}</p>
              <p className="mt-2 font-display text-4xl">
                {plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}`}
                {plan.monthlyPrice ? <span className="text-lg text-muted-foreground">/mo</span> : null}
              </p>
              <p className="mt-2 text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-6 grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>— {feature}</li>
                ))}
              </ul>
              <Button asChild className="mt-6">
                <Link href="/login">
                  {plan.id === "pro" ? "Go Pro" : "Start on Starter"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function HeroInvoice() {
  return (
    <div className="paper-card rotate-1 rounded-[28px] p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studio North</p>
          <p className="font-display text-3xl">Invoice INV-2026-0001</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Sent</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Hearth Goods · Due {format(new Date(), "MMM d")}
      </p>
      <div className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between border-b border-border py-2">
          <span>Visual identity system</span>
          <span>$2,400</span>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <span>Logo suite</span>
          <span>$1,200</span>
        </div>
        <div className="flex justify-between py-2 font-medium">
          <span>Total due</span>
          <span>$4,450</span>
        </div>
      </div>
    </div>
  );
}
