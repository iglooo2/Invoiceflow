"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Share2 } from "lucide-react";
import { generateReferralLink } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";

export function ReferralPanel({
  reward,
  days,
  referralUrl,
  copy,
}: {
  reward: number;
  days: number;
  referralUrl: string | null;
  copy: {
    headline: string;
    lede: string;
    generate: string;
    termsLead: string;
    termsLink: string;
    termsTail: string;
    agree: string;
    share: string;
    copyLink: string;
    copied: string;
    linkLabel: string;
    earnings: string;
    earningsHint: string;
    earningsPlaceholder: string;
    generated: string;
    termsHref: string;
    phoneMore: string;
    phoneTitle: string;
    phoneStatus: string;
  };
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!referralUrl) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: copy.headline, url: referralUrl, text: copy.lede });
        return;
      } catch {
        // Fall through to copy when the share sheet is dismissed or unavailable.
      }
    }
    await copyLink();
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card">
      <div className="px-6 py-12 text-center md:px-12">
        <h2 className="font-display text-3xl md:text-4xl">{copy.headline.replace("{reward}", String(reward))}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          {copy.lede.replace("{days}", String(days))}
        </p>
        <form action={generateReferralLink} className="mx-auto mt-8 max-w-md">
          <label className="mb-4 flex items-start gap-3 text-left text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="agreeTerms"
              required
              defaultChecked={Boolean(referralUrl)}
              className="mt-1 h-4 w-4 rounded border-border accent-accent"
            />
            <span>{copy.agree}</span>
          </label>
          <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto">
            {copy.generate}
          </Button>
        </form>
        <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-muted-foreground">
          {copy.termsLead}{" "}
          <Link href={copy.termsHref} className="font-medium text-accent underline underline-offset-2">
            {copy.termsLink}
          </Link>
          . {copy.termsTail}
        </p>
        {referralUrl ? <p className="mt-4 text-sm text-accent">{copy.generated}</p> : null}
      </div>
      <div className="relative bg-gradient-to-b from-transparent to-muted/60 px-6 pb-12 pt-4 md:px-12">
        <div className="mx-auto w-full max-w-xs rounded-[2rem] border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>9:41</span>
            <span className="font-medium text-accent">{copy.phoneTitle}</span>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-xs">
            <span className="text-muted-foreground">{copy.phoneMore}</span>
            <span className="font-semibold text-accent">{copy.phoneTitle}</span>
            <span className="text-muted-foreground">{copy.phoneStatus}</span>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{copy.linkLabel}</p>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-xs">{referralUrl ?? "invoiceflowstudio.com/r/your-link"}</p>
            <button type="button" onClick={copyLink} className="text-muted-foreground hover:text-foreground" aria-label={copy.copyLink}>
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button type="button" variant="secondary" className="mt-3 w-full" onClick={shareLink} disabled={!referralUrl}>
            <Share2 className="h-4 w-4" />
            {copied ? copy.copied : copy.share}
          </Button>
          <div className="mt-6 rounded-xl bg-muted/50 p-3 text-left">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.earnings}</p>
            <p className="mt-1 font-display text-2xl">{copy.earningsPlaceholder}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{copy.earningsHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
