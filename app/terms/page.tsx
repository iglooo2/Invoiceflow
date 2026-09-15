import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="prose mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">Last updated September 15, 2026. This is an MVP stub — have counsel review before production use.</p>
        <div className="mt-8 grid gap-4 text-sm leading-7">
          <p>InvoiceFlow is a tool for creating, sending, and tracking invoices and proposals. It is not a bank, accountant, tax advisor, or payment processor for your client invoices in this MVP.</p>
          <p>You own the content you upload. You are responsible for the accuracy of invoices, tax, and client communications. We may suspend accounts that abuse the service.</p>
          <p>Subscriptions (Pro) renew monthly via Stripe until cancelled. Free-plan limits are enforced in software and may change with notice.</p>
          <p>The software is provided “as is” without warranties. Limit of liability is the amount you paid us in the prior three months.</p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
