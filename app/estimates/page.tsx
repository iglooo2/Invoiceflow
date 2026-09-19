import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Camera,
  Check,
  ClipboardList,
  FileSignature,
  Layers,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { ESTIMATE_NEW_PATH } from "@/lib/estimates";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: "Estimates",
  description:
    "Price jobs with branded InvoiceFlow Studio estimates — line items, markup, tax, online approval, and QuickBooks Online when you are ready.",
};

const themes = [
  {
    icon: ClipboardList,
    title: "Price the job right",
    body: "Walk the scope once, write it down, and send a number you can stand behind. Accurate estimates keep the work profitable before a single material is ordered.",
  },
  {
    icon: Smartphone,
    title: "Estimate on the spot",
    body: "Build a detailed quote from your phone on the jobsite. Add labor, materials, and notes while the client is still looking at the work — then send the link before you leave.",
  },
  {
    icon: Sparkles,
    title: "Look like a pro",
    body: "Every estimate carries your studio name, colors, and a clean PDF. Clients see a branded document, not a screenshot of a spreadsheet.",
  },
  {
    icon: Layers,
    title: "Price with confidence",
    body: "Itemize the work, add markup, and apply tax. The total updates as you type so you know the number before the client does.",
  },
  {
    icon: FileSignature,
    title: "Get approvals faster",
    body: "Clients open the estimate on their phone, review the line items, type their name, and approve online. No print-sign-scan loop.",
  },
  {
    icon: Camera,
    title: "Photos, files, and repeat jobs",
    body: "Attach photo and file names from the site, reuse saved line items, and start from a job template so the next similar job is already half written.",
  },
];

export default async function EstimatesMarketingPage() {
  const user = await getCurrentUser();
  const createHref = user ? ESTIMATE_NEW_PATH : "/login";

  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Estimates for freelancers & contractors</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Price the job. Send the estimate. Get the yes.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              InvoiceFlow Studio is the focused way to write a branded estimate, send a PDF or share link, and
              know when a client opened or approved it — without turning your week into bookkeeping.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={createHref}>{user ? "Create an estimate" : "Start free — create an estimate"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Starter includes 3 estimates a month. Works from a phone. No 47-step wizard.
            </p>
          </div>
          <HeroEstimate />
        </section>

        <section className="grid gap-6 py-8 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((item) => (
            <div key={item.title} className="paper-card rounded-3xl p-6">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-display text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 py-12 lg:grid-cols-2">
          <div className="paper-card rounded-3xl p-8">
            <h2 className="font-display text-3xl">Build a professional estimate</h2>
            <ul className="mt-6 grid gap-3 text-sm leading-6">
              <li>— Itemized pricing so the client sees labor, materials, and the why.</li>
              <li>— Saved items and templates for the jobs you already know how to price.</li>
              <li>— Photos and files listed on the estimate so the scope is visual, not just a paragraph.</li>
              <li>— Digital signature: type a name, approve online, done.</li>
              <li>
                — Notifications when it is opened or approved (email when a studio address is set; otherwise we
                mark it on the dashboard).
              </li>
              <li>— Phone-first layout for the driveway, the hallway, or the last five minutes of a site visit.</li>
            </ul>
            <Button asChild className="mt-6">
              <Link href={createHref}>Create an estimate</Link>
            </Button>
          </div>
          <div className="paper-card rounded-3xl p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">QuickBooks Online</p>
            <h2 className="mt-3 font-display text-3xl">Keep the books consistent</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              When the job becomes an invoice, the numbers should already match. InvoiceFlow Studio is built to
              sync invoices and estimates with QuickBooks Online so you are not retyping line items for your
              accountant.
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-6">
              <li>
                <Check className="mr-2 inline h-4 w-4 text-primary" />
                Connect once — we remember the company file.
              </li>
              <li>
                <Check className="mr-2 inline h-4 w-4 text-primary" />
                Daily automatic sync, or tap Sync now after a big day of jobs.
              </li>
              <li>
                <Check className="mr-2 inline h-4 w-4 text-primary" />
                Invoices and estimates stay in step so the books match the work.
              </li>
              <li>
                <Check className="mr-2 inline h-4 w-4 text-primary" />
                Your accountant can work from QuickBooks Online; you keep sending from InvoiceFlow Studio.
              </li>
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              Live Intuit OAuth is not on this release. Add an Intuit developer app (
              <code className="text-xs">INTUIT_CLIENT_ID</code> / <code className="text-xs">INTUIT_CLIENT_SECRET</code>
              ) and use <Link href={user ? "/dashboard/settings" : "/login"} className="underline">Settings</Link>{" "}
              to reserve Connect QuickBooks. The marketing story is here; the handshake ships when credentials are
              in.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={user ? "/dashboard/settings" : "/login"}>Open QuickBooks settings</Link>
            </Button>
          </div>
        </section>

        <section className="paper-card mb-8 rounded-[28px] p-8 md:p-12">
          <div className="flex items-start gap-3">
            <Bell className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-3xl">Know when they look — and when they say yes</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                The public estimate link records a first open and an online approval. If you have a studio email,
                InvoiceFlow Studio sends a short note. Either way, the dashboard shows Opened and Approved so you
                can follow up while the job is still warm.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={createHref}>{user ? "Create an estimate" : "Start free"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function HeroEstimate() {
  return (
    <div className="paper-card -rotate-1 rounded-[28px] p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studio North</p>
          <p className="font-display text-3xl">Job estimate</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Sent</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Hearth Goods · Valid 14 days</p>
      <div className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between border-b border-border py-2">
          <span>Site visit & scope</span>
          <span>$125</span>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <span>Labor</span>
          <span>$1,800</span>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <span>Materials allowance</span>
          <span>$640</span>
        </div>
        <div className="flex justify-between py-2 text-muted-foreground">
          <span>Markup + tax</span>
          <span>$205</span>
        </div>
        <div className="flex justify-between py-2 font-medium">
          <span>Estimate total</span>
          <span>$2,770</span>
        </div>
      </div>
    </div>
  );
}
