import Link from "next/link";
import { ArrowRight, FileText, Link2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { startFreeHref } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { StudioProduct } from "@/components/marketing/studio-product";

export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const ctaHref = startFreeHref(signedIn);

  return (
    <div className="landing-canvas">
      <MarketingHeader signedIn={signedIn} />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-6 pt-6 text-center sm:pt-10">
          <p className="text-xs uppercase tracking-[0.28em] text-primary">InvoiceFlow Studio</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-[2.4rem] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-6xl md:text-[4.25rem]">
            Ditch the Word Docs.
            <br />
            Pick a template that matches your work.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            The focused tool for designers, editors, and writers who would rather ship work than wrestle a
            .docx. Choose a studio template, send a PDF or a client link, and know what’s paid.
          </p>
        </section>

        <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-2">
          <StudioProduct />
          <div className="relative z-10 mx-auto -mt-5 flex justify-center sm:-mt-6">
            <Link
              href={ctaHref}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 py-3 text-base font-medium text-foreground shadow-[0_18px_50px_-20px_rgba(28,25,23,0.45)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_-18px_rgba(28,25,23,0.5)]"
            >
              {signedIn ? "Open your studio" : "Start for Free (3 Invoices/mo)"}
            </Link>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4">
          <section id="how" className="grid scroll-mt-24 gap-6 py-12 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Start from a studio template",
                body: "Minimalist invoices, creative proposals, retainers — not a blank spreadsheet pretending to be a brand.",
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
                  <Link href={signedIn ? (plan.id === "pro" ? "/dashboard/billing" : "/dashboard") : "/login?mode=register"}>
                    {plan.id === "pro" ? "Go Pro" : "Start on Starter"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
