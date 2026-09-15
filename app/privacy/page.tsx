import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">Last updated September 15, 2026. Stub for the MVP — replace with a reviewed policy before launch.</p>
        <div className="mt-8 grid gap-4 text-sm leading-7">
          <p>We collect account email, studio profile details, invoices, proposals, and billing metadata needed to run the product.</p>
          <p>Auth may use email/password, GitHub OAuth, and optional Resend magic links. Payments go through Stripe; we store customer and subscription IDs, not full card numbers.</p>
          <p>Public share links are unguessable tokens. Anyone with the link can view the document. Don’t send tokens you want to keep private.</p>
          <p>Contact the operator of this deployment to request export or deletion of your account data.</p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
